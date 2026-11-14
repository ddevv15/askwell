// RLS, grants and constraints of supabase/migrations, on pglite.
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asRole, createSupabasePglite, errorAsRole, type Caller } from "./supabase-pglite";

const OWNER_A = "user_a";
const OWNER_B = "user_b";
const A: Caller = { role: "authenticated", sub: OWNER_A };
const B: Caller = { role: "authenticated", sub: OWNER_B };
const STRANGER: Caller = { role: "authenticated", sub: "user_nobody" };
const NO_SUB: Caller = { role: "authenticated" };
const ANON: Caller = { role: "anon" };
const SERVICE: Caller = { role: "service_role" };

const TABLES = [
  "accounts",
  "projects",
  "widget_configs",
  "knowledge_sources",
  "knowledge_chunks",
  "conversations",
  "messages",
] as const;
type Table = (typeof TABLES)[number];

/** A harmless SET clause per table, for UPDATE permission checks. */
const UPDATE_SET: Record<Table, string> = {
  accounts: "plan = 'pro'",
  projects: "name = 'x'",
  widget_configs: "show_badge = false",
  knowledge_sources: "title = 'x'",
  knowledge_chunks: "content = 'x'",
  conversations: "visitor_id = 'x'",
  messages: "body = 'x'",
};

const vec = (x: number) => `[${Array(1536).fill(x).join(",")}]`;

// Rows per owner: 1 account, 1 project, 1 config, 2 sources, 2 chunks, 1 conversation, 2 messages.
const ROWS_PER_OWNER: Record<Table, number> = {
  accounts: 1,
  projects: 1,
  widget_configs: 1,
  knowledge_sources: 2,
  knowledge_chunks: 2,
  conversations: 1,
  messages: 2,
};

let db: PGlite;
const ids: Record<string, { project: string; textSource: string; conversation: string }> = {};

async function seedOwner(owner: string) {
  await db.query("insert into public.accounts (clerk_user_id) values ($1)", [owner]);
  const project = (
    await db.query<{ id: string }>(
      "insert into public.projects (owner_id, name, public_key) values ($1, $2, $3) returning id",
      [owner, `${owner} project`, `pk_${owner}_0123456789abcdef`],
    )
  ).rows[0].id;
  await db.query(
    `insert into public.widget_configs (project_id, button_color, position, label, animation, header_text, show_badge)
     values ($1, '#000000', 'bottom-right', 'Chat with us', 'fade', 'How can we help?', true)`,
    [project],
  );
  const textSource = (
    await db.query<{ id: string }>(
      "insert into public.knowledge_sources (project_id, title, type, status) values ($1, 'FAQ', 'text', 'ready') returning id",
      [project],
    )
  ).rows[0].id;
  const pdfSource = (
    await db.query<{ id: string }>(
      `insert into public.knowledge_sources (project_id, title, type, storage_key, status)
       values ($1, 'Guide', 'pdf', $2, 'ready') returning id`,
      [project, `${project}/guide.pdf`],
    )
  ).rows[0].id;
  for (const source of [textSource, pdfSource]) {
    await db.query(
      "insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, $2, 'chunk', $3)",
      [project, source, vec(0.1)],
    );
  }
  const conversation = (
    await db.query<{ id: string }>(
      "insert into public.conversations (project_id, visitor_id) values ($1, 'v_12345678') returning id",
      [project],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.messages (conversation_id, role, body) values ($1, 'visitor', 'Hi'), ($1, 'bot', 'Hello!')",
    [conversation],
  );
  ids[owner] = { project, textSource, conversation };
}

const count = async (tx: Transaction, table: Table) =>
  (await tx.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n;

beforeAll(async () => {
  db = await createSupabasePglite();
  await seedOwner(OWNER_A);
  await seedOwner(OWNER_B);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("schema", () => {
  it("creates pgvector, all 7 tables with RLS on, and the HNSW index", async () => {
    const ext = await db.query("select 1 from pg_extension where extname = 'vector'");
    expect(ext.rows).toHaveLength(1);

    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
    );
    expect(tables.rows.map((r) => r.relname)).toEqual([...TABLES].sort());
    expect(tables.rows.every((r) => r.relrowsecurity)).toBe(true);

    const hnsw = await db.query<{ indexdef: string }>(
      "select indexdef from pg_indexes where indexname = 'knowledge_chunks_embedding_idx'",
    );
    expect(hnsw.rows[0].indexdef).toMatch(/USING hnsw \(embedding extensions\.vector_cosine_ops\)/);
  });

  it("indexes every foreign key column", async () => {
    // For each FK, some index must start with exactly the FK's columns.
    const unindexed = await db.query(`
      select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey
        )`);
    expect(unindexed.rows).toEqual([]);
  });

  it("applies defaults", async () => {
    const row = await asRole(db, SERVICE, async (tx) => {
      await tx.query("insert into public.accounts (clerk_user_id) values ('user_new')");
      return (
        await tx.query<{ plan: string; messages_used: number; has_period: boolean; has_created: boolean }>(
          `insert into public.projects (owner_id, name, public_key) values ('user_new', 'New', 'pk_new_0123456789abcdef')
           returning (select plan from public.accounts where clerk_user_id = 'user_new') as plan,
                     messages_used, period_start is not null as has_period, created_at is not null as has_created`,
        )
      ).rows[0];
    });
    expect(row).toEqual({ plan: "free", messages_used: 0, has_period: true, has_created: true });
  });

  it.each([
    ["plan", "insert into public.accounts (clerk_user_id, plan) values ('x', 'enterprise')"],
    [
      "position",
      `insert into public.widget_configs (project_id, button_color, position, label, animation, header_text, show_badge)
       select id, '#000000', 'center', 'l', 'fade', 'h', true from public.projects limit 1`,
    ],
    [
      "animation",
      `insert into public.widget_configs (project_id, button_color, position, label, animation, header_text, show_badge)
       select id, '#000000', 'top-left', 'l', 'bounce', 'h', true from public.projects limit 1`,
    ],
    [
      "button color",
      `insert into public.widget_configs (project_id, button_color, position, label, animation, header_text, show_badge)
       select id, 'red', 'top-left', 'l', 'fade', 'h', true from public.projects limit 1`,
    ],
    ["source type", "insert into public.knowledge_sources (project_id, title, type, storage_key, status) select id, 't', 'docx', 'k', 'ready' from public.projects limit 1"],
    ["source status", "insert into public.knowledge_sources (project_id, title, type, status) select id, 't', 'text', 'done' from public.projects limit 1"],
    ["text source with a file", "insert into public.knowledge_sources (project_id, title, type, storage_key, status) select id, 't', 'text', 'k', 'ready' from public.projects limit 1"],
    ["file source without a file", "insert into public.knowledge_sources (project_id, title, type, status) select id, 't', 'pdf', 'uploading' from public.projects limit 1"],
    ["message role", "insert into public.messages (conversation_id, role, body) select id, 'owner', 'x' from public.conversations limit 1"],
    ["duplicate public key", "insert into public.projects (owner_id, name, public_key) values ('user_a', 'Dup', 'pk_user_a_0123456789abcdef')"],
    ["empty project name", "insert into public.projects (owner_id, name, public_key) values ('user_a', '  ', 'pk_x_0123456789abcdef')"],
    ["negative messages_used", "update public.projects set messages_used = -1"],
  ])("rejects bad %s", async (_name, sql) => {
    expect(await errorAsRole(db, SERVICE, (tx) => tx.exec(sql))).not.toBeNull();
  });

  it("rejects a chunk whose project differs from its source's project", async () => {
    const err = await errorAsRole(db, SERVICE, (tx) =>
      tx.query(
        "insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, $2, 'x', $3)",
        [ids[OWNER_B].project, ids[OWNER_A].textSource, vec(0.2)],
      ),
    );
    expect(err?.message).toMatch(/knowledge_chunks_source_id_project_id_fkey/);
  });
});

describe("authenticated owner", () => {
  it.each(TABLES)("sees only their own rows in %s", async (table) => {
    for (const caller of [A, B]) {
      const n = await asRole(db, caller, (tx) => count(tx, table));
      expect(n).toBe(ROWS_PER_OWNER[table]);
    }
  });

  it.each(TABLES)("never sees owner B's rows in %s", async (table) => {
    const projectCol = table === "messages" ? null : table === "accounts" ? "clerk_user_id" : table === "projects" ? "id" : "project_id";
    const n = await asRole(db, A, async (tx) => {
      if (projectCol === null) {
        return (
          await tx.query<{ n: number }>("select count(*)::int as n from public.messages where conversation_id = $1", [
            ids[OWNER_B].conversation,
          ])
        ).rows[0].n;
      }
      const value = table === "accounts" ? OWNER_B : ids[OWNER_B].project;
      return (
        await tx.query<{ n: number }>(`select count(*)::int as n from public.${table} where ${projectCol} = $1`, [value])
      ).rows[0].n;
    });
    expect(n).toBe(0);
  });

  it.each([STRANGER, NO_SUB])("a user with no projects sees nothing (%o)", async (caller) => {
    for (const table of TABLES) {
      expect(await asRole(db, caller, (tx) => count(tx, table))).toBe(0);
    }
  });

  it("can rename their own project", async () => {
    const rows = await asRole(db, A, async (tx) => {
      await tx.query("update public.projects set name = 'Renamed' where id = $1", [ids[OWNER_A].project]);
      return (await tx.query<{ name: string }>("select name from public.projects")).rows;
    });
    expect(rows).toEqual([{ name: "Renamed" }]);
  });

  it("cannot rename another owner's project (0 rows)", async () => {
    const affected = await asRole(db, A, async (tx) => {
      const res = await tx.query("update public.projects set name = 'Hacked' where id = $1", [ids[OWNER_B].project]);
      return res.affectedRows;
    });
    expect(affected).toBe(0);
    const name = (await db.query<{ name: string }>("select name from public.projects where id = $1", [ids[OWNER_B].project]))
      .rows[0].name;
    expect(name).toBe("user_b project");
  });

  it.each([
    ["owner_id", "'user_b'"],
    ["public_key", "'pk_stolen_0123456789abcdef'"],
    ["messages_used", "0"],
    ["period_start", "now()"],
    ["created_at", "now()"],
    ["id", "gen_random_uuid()"],
  ])("cannot update projects.%s", async (column, value) => {
    const err = await errorAsRole(db, A, (tx) =>
      tx.query(`update public.projects set ${column} = ${value} where id = $1`, [ids[OWNER_A].project]),
    );
    expect(err?.message).toMatch(/permission denied/);
  });

  it.each(TABLES.filter((t) => t !== "projects"))("cannot update %s", async (table) => {
    const err = await errorAsRole(db, A, (tx) => tx.exec(`update public.${table} set ${UPDATE_SET[table]}`));
    expect(err?.message).toMatch(/permission denied/);
  });

  it("can delete their own project, and its children cascade", async () => {
    const after = await asRole(db, A, async (tx) => {
      const res = await tx.query("delete from public.projects where id = $1", [ids[OWNER_A].project]);
      expect(res.affectedRows).toBe(1);
      // Count as the superuser view inside the same transaction.
      await tx.exec("reset role");
      const counts: Record<string, number> = {};
      for (const table of TABLES) {
        counts[table] = await count(tx, table);
      }
      return counts;
    });
    expect(after).toEqual({
      accounts: 2,
      projects: 1,
      widget_configs: 1,
      knowledge_sources: 2,
      knowledge_chunks: 2,
      conversations: 1,
      messages: 2,
    });
  });

  it("cannot delete another owner's project (0 rows)", async () => {
    const affected = await asRole(db, A, async (tx) => {
      return (await tx.query("delete from public.projects where id = $1", [ids[OWNER_B].project])).affectedRows;
    });
    expect(affected).toBe(0);
  });

  it.each(TABLES.filter((t) => t !== "projects"))("cannot delete from %s", async (table) => {
    const err = await errorAsRole(db, A, (tx) => tx.exec(`delete from public.${table}`));
    expect(err?.message).toMatch(/permission denied/);
  });

  it.each(TABLES)("cannot insert into %s", async (table) => {
    const err = await errorAsRole(db, A, (tx) => tx.exec(`insert into public.${table} default values`));
    expect(err?.message).toMatch(/permission denied/);
  });

  it.each(TABLES)("cannot truncate %s", async (table) => {
    const err = await errorAsRole(db, A, (tx) => tx.exec(`truncate public.${table} cascade`));
    expect(err?.message).toMatch(/permission denied/);
  });
});

describe("anon", () => {
  it.each(TABLES)("cannot select, insert, update, delete or truncate %s", async (table) => {
    for (const sql of [
      `select * from public.${table}`,
      `insert into public.${table} default values`,
      `update public.${table} set ${UPDATE_SET[table]}`,
      `delete from public.${table}`,
      `truncate public.${table} cascade`,
    ]) {
      const err = await errorAsRole(db, ANON, (tx) => tx.exec(sql));
      expect(err?.message, sql).toMatch(/permission denied/);
    }
  });

  it.each(["owned_project_ids", "owned_conversation_ids"])("cannot execute private.%s", async (fn) => {
    const err = await errorAsRole(db, ANON, (tx) => tx.exec(`select private.${fn}()`));
    expect(err?.message).toMatch(/permission denied/);
  });
});

describe("RLS helpers", () => {
  it("are SECURITY DEFINER with an empty search_path", async () => {
    const fns = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] }>(
      "select proname, prosecdef, proconfig from pg_proc where pronamespace = 'private'::regnamespace order by proname",
    );
    expect(fns.rows).toEqual([
      { proname: "owned_conversation_ids", prosecdef: true, proconfig: ['search_path=""'] },
      { proname: "owned_project_ids", prosecdef: true, proconfig: ['search_path=""'] },
    ]);
  });

  it("return only the caller's ids", async () => {
    const rows = await asRole(db, A, async (tx) => ({
      projects: (await tx.query<{ id: string }>("select id from private.owned_project_ids() as id")).rows.map((r) => r.id),
      conversations: (await tx.query<{ id: string }>("select id from private.owned_conversation_ids() as id")).rows.map(
        (r) => r.id,
      ),
    }));
    expect(rows).toEqual({ projects: [ids[OWNER_A].project], conversations: [ids[OWNER_A].conversation] });
  });

  it("only authenticated may execute them (not PUBLIC or service_role)", async () => {
    const res = await db.query<{ role: string; can: boolean }>(`
      select r as role, has_function_privilege(r, 'private.owned_project_ids()', 'execute') as can
      from unnest(array['anon', 'authenticated', 'service_role']) as r order by r`);
    expect(res.rows).toEqual([
      { role: "anon", can: false },
      { role: "authenticated", can: true },
      { role: "service_role", can: false },
    ]);
  });
});

describe("service_role", () => {
  it.each(TABLES)("sees every row in %s", async (table) => {
    expect(await asRole(db, SERVICE, (tx) => count(tx, table))).toBe(ROWS_PER_OWNER[table] * 2);
  });

  it("can insert, update and delete in every table", async () => {
    await asRole(db, SERVICE, async (tx) => {
      await tx.query("insert into public.accounts (clerk_user_id, plan) values ('user_c', 'pro')");
      const project = (
        await tx.query<{ id: string }>(
          "insert into public.projects (owner_id, name, public_key) values ('user_c', 'C', 'pk_user_c_0123456789abcdef') returning id",
        )
      ).rows[0].id;
      await tx.query(
        `insert into public.widget_configs (project_id, button_color, position, label, animation, header_text, show_badge)
         values ($1, '#ff0066', 'top-left', 'Help', 'scale', 'Hi', false)`,
        [project],
      );
      const source = (
        await tx.query<{ id: string }>(
          "insert into public.knowledge_sources (project_id, title, type, storage_key, status) values ($1, 'G', 'md', 'c/g.md', 'uploading') returning id",
          [project],
        )
      ).rows[0].id;
      await tx.query(
        "insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, $2, 'c', $3)",
        [project, source, vec(0.3)],
      );
      const conversation = (
        await tx.query<{ id: string }>(
          "insert into public.conversations (project_id, visitor_id) values ($1, 'v_abcdefgh') returning id",
          [project],
        )
      ).rows[0].id;
      await tx.query("insert into public.messages (conversation_id, role, body) values ($1, 'visitor', 'q')", [conversation]);

      await tx.query("update public.accounts set plan = 'free' where clerk_user_id = 'user_c'");
      await tx.query("update public.projects set messages_used = messages_used + 1, public_key = 'pk_user_c_rotated_0123456' where id = $1", [project]);
      await tx.query("update public.widget_configs set show_badge = true where project_id = $1", [project]);
      await tx.query("update public.knowledge_sources set status = 'processing' where id = $1", [source]);
      await tx.query("update public.knowledge_chunks set content = 'c2' where source_id = $1", [source]);
      await tx.query("update public.conversations set visitor_id = 'v_changed1' where id = $1", [conversation]);
      await tx.query("update public.messages set body = 'q2' where conversation_id = $1", [conversation]);

      // Nearest-neighbour search works with the cosine operator.
      const nearest = await tx.query<{ content: string }>(
        "select content from public.knowledge_chunks where project_id = $1 order by embedding operator(extensions.<=>) $2 limit 1",
        [project, vec(0.3)],
      );
      expect(nearest.rows).toEqual([{ content: "c2" }]);

      await tx.query("delete from public.messages where conversation_id = $1", [conversation]);
      await tx.query("delete from public.conversations where id = $1", [conversation]);
      await tx.query("delete from public.knowledge_chunks where source_id = $1", [source]);
      await tx.query("delete from public.knowledge_sources where id = $1", [source]);
      await tx.query("delete from public.widget_configs where project_id = $1", [project]);
      await tx.query("delete from public.projects where id = $1", [project]);
      await tx.query("delete from public.accounts where clerk_user_id = 'user_c'");
    });
  });

  it("deleting a source deletes its chunks", async () => {
    const left = await asRole(db, SERVICE, async (tx) => {
      await tx.query("delete from public.knowledge_sources where id = $1", [ids[OWNER_A].textSource]);
      return (
        await tx.query<{ n: number }>("select count(*)::int as n from public.knowledge_chunks where source_id = $1", [
          ids[OWNER_A].textSource,
        ])
      ).rows[0].n;
    });
    expect(left).toBe(0);
  });

  it.each(TABLES)("cannot truncate %s (TRUNCATE revoked)", async (table) => {
    const err = await errorAsRole(db, SERVICE, (tx) => tx.exec(`truncate public.${table} cascade`));
    expect(err?.message).toMatch(/permission denied/);
  });
});
