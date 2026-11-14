// Widget config (project.md §6.5, §6.8, §7 widget_configs).
import { z } from "zod";
import { widgetAnimationSchema, widgetPositionSchema } from "./enums";
import { MAX_WIDGET_HEADER_LENGTH, MAX_WIDGET_LABEL_LENGTH } from "./limits";

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1a2b3c");

export const widgetConfigSchema = z.object({
  buttonColor: hexColorSchema,
  position: widgetPositionSchema,
  label: z.string().trim().min(1).max(MAX_WIDGET_LABEL_LENGTH),
  animation: widgetAnimationSchema,
  headerText: z.string().trim().min(1).max(MAX_WIDGET_HEADER_LENGTH),
  showBadge: z.boolean(),
});
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

/** Free defaults. New projects start with these; Free projects are always served these. */
export const DEFAULT_WIDGET_CONFIG = {
  buttonColor: "#000000",
  position: "bottom-right",
  label: "Chat with us",
  animation: "fade",
  headerText: "How can we help?",
  showBadge: true,
} as const satisfies WidgetConfig;
