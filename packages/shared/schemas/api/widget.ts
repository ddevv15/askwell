// Public routes, called by the widget from any origin (§8 Public).
import { z } from "zod";
import { MAX_MESSAGE_LENGTH, MAX_VISITOR_ID_LENGTH } from "../../limits";
import { widgetConfigSchema } from "../widget";
import { idSchema, publicKeySchema } from "./common";

// GET /api/widget/config?key=pk_...
export const widgetConfigQuerySchema = z.object({ key: publicKeySchema });
export type WidgetConfigQuery = z.infer<typeof widgetConfigQuerySchema>;

/** Config with the plan applied: Free gets the defaults and the badge. */
export const widgetConfigResponseSchema = z.object({ config: widgetConfigSchema });
export type WidgetConfigResponse = z.infer<typeof widgetConfigResponseSchema>;

// POST /api/widget/chat
export const visitorIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid visitor ID")
  .min(8)
  .max(MAX_VISITOR_ID_LENGTH);

export const chatRequestSchema = z.strictObject({
  key: publicKeySchema,
  visitorId: visitorIdSchema,
  conversationId: idSchema.optional(),
  message: z.string().trim().min(1, "Message is empty").max(MAX_MESSAGE_LENGTH),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  conversationId: idSchema,
  reply: z.string(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;
