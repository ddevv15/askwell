// Test helper: an in-memory Postgres (pglite) that looks enough like Supabase
// to test our migrations, RLS policies and grants. Never a local Supabase stack.
//
// It stubs what Supabase provides before our migrations run:
// - the API roles `anon`, `authenticated`, `service_role` (bypassrls)
// - the `auth` and `extensions` schemas, and `auth.jwt()` reading the
//   `request.jwt.claims` setting the way Supabase does
// - Supabase's default privileges: API roles get ALL on new tables, sequences
//   and functions in `public` (so the tests prove our REVOKEs work)
// Then it runs every file in `supabase/migrations` in name order.
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const MIGRATIONS_DIR = fileURLToPath(new URL("../../supabase/migrations", import.meta.url));

const SUPABASE_STUB = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create function auth.jwt() returns jsonb
    language sql stable
    as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
      )::jsonb
    $$;
  grant execute on function auth.jwt() to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

/** Migration files in apply order. */
export function migrationFiles(dir: string = MIGRATIONS_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f))
    .sort();
}

/** A fresh database with the Supabase stub and every migration applied. */
export async function createSupabasePglite(dir: string = MIGRATIONS_DIR): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { vector } });
  await db.exec(SUPABASE_STUB);
  for (const file of migrationFiles(dir)) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`, { cause: err });
    }
  }
  return db;
}

export type ApiRole = "anon" | "authenticated" | "service_role";

export interface Caller {
  role: ApiRole;
  /** Clerk user ID, put in the JWT `sub` claim (authenticated callers). */
  sub?: string;
}

/**
 * Run `fn` as an API role with its JWT claims, the way PostgREST does
 * (`set local role` + `request.jwt.claims`), inside a transaction that is
 * always rolled back, so each call leaves the database unchanged.
 */
export async function asRole<T>(db: PGlite, caller: Caller, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ role: caller.role, ...(caller.sub ? { sub: caller.sub } : {}) });
  let result: T | undefined;
  await db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await tx.exec(`set local role ${caller.role}`);
    result = await fn(tx);
    await tx.rollback();
  });
  return result as T;
}

/** Like `asRole`, but returns the error Postgres raised (or null if none). */
export async function errorAsRole(
  db: PGlite,
  caller: Caller,
  fn: (tx: Transaction) => Promise<unknown>,
): Promise<Error | null> {
  try {
    await asRole(db, caller, fn);
    return null;
  } catch (err) {
    return err as Error;
  }
}
