// Enums shared by the database (§7) and the API (§8). The DB check constraints
// must use exactly these values.
import { z } from "zod";

export const PLANS = ["free", "pro"] as const;
export const planSchema = z.enum(PLANS);
export type Plan = z.infer<typeof planSchema>;

export const WIDGET_POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left"] as const;
export const widgetPositionSchema = z.enum(WIDGET_POSITIONS);
export type WidgetPosition = z.infer<typeof widgetPositionSchema>;

export const WIDGET_ANIMATIONS = ["fade", "slide", "scale"] as const;
export const widgetAnimationSchema = z.enum(WIDGET_ANIMATIONS);
export type WidgetAnimation = z.infer<typeof widgetAnimationSchema>;

export const KNOWLEDGE_SOURCE_TYPES = ["text", "pdf", "md", "txt"] as const;
export const knowledgeSourceTypeSchema = z.enum(KNOWLEDGE_SOURCE_TYPES);
export type KnowledgeSourceType = z.infer<typeof knowledgeSourceTypeSchema>;

export const KNOWLEDGE_SOURCE_STATUSES = ["uploading", "processing", "ready", "failed"] as const;
export const knowledgeSourceStatusSchema = z.enum(KNOWLEDGE_SOURCE_STATUSES);
export type KnowledgeSourceStatus = z.infer<typeof knowledgeSourceStatusSchema>;

export const MESSAGE_ROLES = ["visitor", "bot"] as const;
export const messageRoleSchema = z.enum(MESSAGE_ROLES);
export type MessageRole = z.infer<typeof messageRoleSchema>;
