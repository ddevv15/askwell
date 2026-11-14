// The single place plan limits live (project.md §5). The server reads the plan
// from the database and looks it up here; the client never decides.
import type { Plan, WidgetAnimation, WidgetPosition } from "./enums";
import { WIDGET_ANIMATIONS, WIDGET_POSITIONS } from "./enums";

export interface CustomizeAllowances {
  /** May set any button color (Free: default only). */
  customColor: boolean;
  /** Button positions the plan may use. */
  positions: readonly WidgetPosition[];
  /** May set a custom button label. */
  customLabel: boolean;
  /** Open animations the plan may use. */
  animations: readonly WidgetAnimation[];
  /** May set custom header text. */
  customHeader: boolean;
  /** May hide the "Powered by" badge. */
  hideBadge: boolean;
}

export interface PlanLimits {
  /** Projects per account. */
  projects: number;
  /** Accepted chat messages per project per monthly period. */
  messagesPerMonth: number;
  /** Knowledge sources per project (files + pasted text). */
  knowledgeSources: number;
  customize: CustomizeAllowances;
}

export const PLAN_LIMITS = {
  free: {
    projects: 1,
    messagesPerMonth: 100,
    knowledgeSources: 3,
    customize: {
      customColor: false,
      positions: ["bottom-right"],
      customLabel: false,
      animations: ["fade"],
      customHeader: false,
      hideBadge: false,
    },
  },
  pro: {
    projects: 5,
    messagesPerMonth: 2000,
    knowledgeSources: 25,
    customize: {
      customColor: true,
      positions: WIDGET_POSITIONS,
      customLabel: true,
      animations: WIDGET_ANIMATIONS,
      customHeader: true,
      hideBadge: true,
    },
  },
} as const satisfies Record<Plan, PlanLimits>;
