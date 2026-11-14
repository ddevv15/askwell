// Owner routes: conversations (§6.7, §8 Owner).
import { z } from "zod";
import { messageRoleSchema } from "../enums";
import { idSchema, timestampSchema } from "./common";

export const conversationSummarySchema = z.object({
  id: idSchema,
  visitorId: z.string(),
  createdAt: timestampSchema,
  /** Start of the first message. Null if the conversation has no messages. */
  preview: z.string().nullable(),
  messageCount: z.int().nonnegative(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

// GET /api/projects/:id/conversations (newest first)
export const listConversationsResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema),
});
export type ListConversationsResponse = z.infer<typeof listConversationsResponseSchema>;

export const messageSchema = z.object({
  id: idSchema,
  role: messageRoleSchema,
  /** Render as text, never HTML (§9 XSS). */
  body: z.string(),
  createdAt: timestampSchema,
});
export type Message = z.infer<typeof messageSchema>;

// GET /api/conversations/:id (oldest message first)
export const conversationThreadResponseSchema = z.object({
  conversation: z.object({
    id: idSchema,
    projectId: idSchema,
    visitorId: z.string(),
    createdAt: timestampSchema,
  }),
  messages: z.array(messageSchema),
});
export type ConversationThreadResponse = z.infer<typeof conversationThreadResponseSchema>;
