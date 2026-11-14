import { z } from "zod";
import { ERROR_CODES, type ApiError } from "../errors";

export const errorCodeSchema = z.enum(ERROR_CODES);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
}) satisfies z.ZodType<ApiError>;
