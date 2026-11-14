import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDGET_CONFIG,
  ERROR_STATUS,
  KNOWLEDGE_SOURCE_STATUSES,
  KNOWLEDGE_SOURCE_TYPES,
  MAX_KNOWLEDGE_FILE_BYTES,
  MAX_MESSAGE_LENGTH,
  MESSAGE_ROLES,
  PLAN_LIMITS,
  WIDGET_ANIMATIONS,
  WIDGET_POSITIONS,
  apiError,
  apiErrorSchema,
  knowledgeFileTypeFromName,
  widgetConfigSchema,
} from "../index";

describe("enums", () => {
  it("match the §7 column values", () => {
    expect(WIDGET_POSITIONS).toEqual(["bottom-right", "bottom-left", "top-right", "top-left"]);
    expect(WIDGET_ANIMATIONS).toEqual(["fade", "slide", "scale"]);
    expect(KNOWLEDGE_SOURCE_TYPES).toEqual(["text", "pdf", "md", "txt"]);
    expect(KNOWLEDGE_SOURCE_STATUSES).toEqual(["uploading", "processing", "ready", "failed"]);
    expect(MESSAGE_ROLES).toEqual(["visitor", "bot"]);
  });
});

describe("limits", () => {
  it("message limit is 1,000 characters and file limit 10 MB", () => {
    expect(MAX_MESSAGE_LENGTH).toBe(1000);
    expect(MAX_KNOWLEDGE_FILE_BYTES).toBe(10 * 1024 * 1024);
  });

  it.each([
    ["guide.pdf", "pdf"],
    ["README.MD", "md"],
    ["notes.markdown", "md"],
    ["faq.v2.txt", "txt"],
  ])("knowledgeFileTypeFromName(%s) = %s", (name, type) => {
    expect(knowledgeFileTypeFromName(name)).toBe(type);
  });

  it.each(["doc.docx", "pdf", ".pdf", "file.", "sheet.xlsx", "toString", "a.constructor"])(
    "knowledgeFileTypeFromName(%s) = null",
    (name) => {
      expect(knowledgeFileTypeFromName(name)).toBeNull();
    },
  );
});

describe("widget config", () => {
  it("default config is valid and uses only Free allowances", () => {
    expect(widgetConfigSchema.parse(DEFAULT_WIDGET_CONFIG)).toEqual(DEFAULT_WIDGET_CONFIG);
    expect(PLAN_LIMITS.free.customize.positions).toContain(DEFAULT_WIDGET_CONFIG.position);
    expect(PLAN_LIMITS.free.customize.animations).toContain(DEFAULT_WIDGET_CONFIG.animation);
    expect(DEFAULT_WIDGET_CONFIG.showBadge).toBe(true);
  });

  it("rejects a bad color, position and animation", () => {
    expect(widgetConfigSchema.safeParse({ ...DEFAULT_WIDGET_CONFIG, buttonColor: "red" }).success).toBe(false);
    expect(widgetConfigSchema.safeParse({ ...DEFAULT_WIDGET_CONFIG, position: "center" }).success).toBe(false);
    expect(widgetConfigSchema.safeParse({ ...DEFAULT_WIDGET_CONFIG, animation: "bounce" }).success).toBe(false);
  });
});

describe("errors", () => {
  it("apiError builds a body that matches the schema", () => {
    const body = apiError("plan_required", "Upgrade to Pro");
    expect(apiErrorSchema.parse(body)).toEqual({ error: { code: "plan_required", message: "Upgrade to Pro" } });
  });

  it("rejects unknown codes and missing message", () => {
    expect(apiErrorSchema.safeParse({ error: { code: "nope", message: "x" } }).success).toBe(false);
    expect(apiErrorSchema.safeParse({ error: { code: "not_found" } }).success).toBe(false);
  });

  it("maps codes to the statuses §6 relies on", () => {
    expect(ERROR_STATUS.plan_required).toBe(402);
    expect(ERROR_STATUS.not_found).toBe(404);
    expect(ERROR_STATUS.rate_limited).toBe(429);
    expect(ERROR_STATUS.quota_exceeded).toBe(429);
  });
});
