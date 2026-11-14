// Widget config (project.md §6.5, §6.8, §7 widget_configs). Zod-free.
import type { WidgetAnimation, WidgetPosition } from "./enums";

export interface WidgetConfig {
  /** 6-digit hex, e.g. #1a2b3c. */
  buttonColor: string;
  position: WidgetPosition;
  label: string;
  animation: WidgetAnimation;
  headerText: string;
  showBadge: boolean;
}

/** Free defaults. New projects start with these; Free projects are always served these. */
export const DEFAULT_WIDGET_CONFIG = {
  buttonColor: "#000000",
  position: "bottom-right",
  label: "Chat with us",
  animation: "fade",
  headerText: "How can we help?",
  showBadge: true,
} as const satisfies WidgetConfig;
