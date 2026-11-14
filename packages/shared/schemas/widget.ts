import { z } from "zod";
import { MAX_WIDGET_HEADER_LENGTH, MAX_WIDGET_LABEL_LENGTH } from "../limits";
import type { WidgetConfig } from "../widget";
import { widgetAnimationSchema, widgetPositionSchema } from "./enums";

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1a2b3c");

export const widgetConfigSchema = z.object({
  buttonColor: hexColorSchema,
  position: widgetPositionSchema,
  label: z.string().trim().min(1).max(MAX_WIDGET_LABEL_LENGTH),
  animation: widgetAnimationSchema,
  headerText: z.string().trim().min(1).max(MAX_WIDGET_HEADER_LENGTH),
  showBadge: z.boolean(),
}) satisfies z.ZodType<WidgetConfig>;
