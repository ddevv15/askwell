// Error shape for every API route: { error: { code, message } } (CLAUDE.md).
import { z } from "zod";

/** Every error code a route may return, with its HTTP status. */
export const ERROR_STATUS = {
  invalid_request: 400,
  unauthorized: 401,
  /** Feature needs Pro (e.g. Customize save on Free, §6.8). */
  plan_required: 402,
  /** Plan count limit hit: projects or knowledge sources. */
  limit_reached: 403,
  forbidden: 403,
  not_found: 404,
  /** State conflict, e.g. a source already finalized. */
  conflict: 409,
  file_too_large: 413,
  unsupported_file_type: 415,
  /** Arcjet flagged the chat message (prompt injection). */
  message_blocked: 422,
  /** Arcjet rate limit. */
  rate_limited: 429,
  /** Monthly message quota used up. */
  quota_exceeded: 429,
  internal_error: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;
export const ERROR_CODES = Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]];
export const errorCodeSchema = z.enum(ERROR_CODES);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Build the error body for a code. Pair with `ERROR_STATUS[code]` for the status. */
export function apiError(code: ErrorCode, message: string): ApiError {
  return { error: { code, message } };
}
