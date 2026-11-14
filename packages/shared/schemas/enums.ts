import { z } from "zod";
import {
  KNOWLEDGE_SOURCE_STATUSES,
  KNOWLEDGE_SOURCE_TYPES,
  MESSAGE_ROLES,
  PLANS,
  WIDGET_ANIMATIONS,
  WIDGET_POSITIONS,
} from "../enums";

export const planSchema = z.enum(PLANS);
export const widgetPositionSchema = z.enum(WIDGET_POSITIONS);
export const widgetAnimationSchema = z.enum(WIDGET_ANIMATIONS);
export const knowledgeSourceTypeSchema = z.enum(KNOWLEDGE_SOURCE_TYPES);
export const knowledgeSourceStatusSchema = z.enum(KNOWLEDGE_SOURCE_STATUSES);
export const messageRoleSchema = z.enum(MESSAGE_ROLES);
