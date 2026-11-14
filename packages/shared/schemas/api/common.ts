import { z } from "zod";

export const idSchema = z.uuid();

/** A project's public key: `pk_` + random URL-safe characters (§6.3). */
export const publicKeySchema = z.string().regex(/^pk_[A-Za-z0-9_-]{16,64}$/, "Invalid public key");

/** Timestamps are ISO 8601 strings with an offset (Postgres timestamptz). */
export const timestampSchema = z.iso.datetime({ offset: true });

/** Path params for routes with `:id`. */
export const idParamsSchema = z.object({ id: idSchema });
export type IdParams = z.infer<typeof idParamsSchema>;

/** Response of a DELETE route: the id that was deleted. */
export const deleteResponseSchema = z.object({ id: idSchema });
export type DeleteResponse = z.infer<typeof deleteResponseSchema>;
