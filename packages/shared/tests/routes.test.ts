import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  DEFAULT_WIDGET_CONFIG,
  MAX_KNOWLEDGE_FILE_BYTES,
  MAX_MESSAGE_LENGTH,
  chatRequestSchema,
  chatResponseSchema,
  conversationThreadResponseSchema,
  createProjectRequestSchema,
  createProjectResponseSchema,
  deleteResponseSchema,
  finalizeKnowledgeRequestSchema,
  finalizeKnowledgeResponseSchema,
  idParamsSchema,
  knowledgeUploadUrlRequestSchema,
  knowledgeUploadUrlResponseSchema,
  listConversationsResponseSchema,
  listProjectsResponseSchema,
  pasteKnowledgeRequestSchema,
  pasteKnowledgeResponseSchema,
  posthogConfigResponseSchema,
  updateProjectRequestSchema,
  updateProjectResponseSchema,
  updateWidgetConfigRequestSchema,
  updateWidgetConfigResponseSchema,
  widgetConfigQuerySchema,
  widgetConfigResponseSchema,
} from "../index";

const ID = "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";
const KEY = "pk_Ab12Cd34Ef56Gh78";
const NOW = "2026-11-14T10:00:00.123456+00:00";

const project = {
  id: ID,
  name: "Acme",
  publicKey: KEY,
  messagesUsed: 3,
  periodStart: NOW,
  createdAt: NOW,
};
const source = { id: ID, projectId: ID, title: "FAQ", type: "pdf", status: "uploading", createdAt: NOW };

function ok(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
}
function bad(schema: z.ZodType, value: unknown) {
  expect(schema.safeParse(value).success).toBe(false);
}

describe("common", () => {
  it("id params", () => {
    ok(idParamsSchema, { id: ID });
    bad(idParamsSchema, { id: "1" });
  });
  it("delete response", () => {
    ok(deleteResponseSchema, { id: ID });
    bad(deleteResponseSchema, {});
  });
});

describe("GET /api/widget/config", () => {
  it("query", () => {
    ok(widgetConfigQuerySchema, { key: KEY });
    bad(widgetConfigQuerySchema, {});
    bad(widgetConfigQuerySchema, { key: "sk_Ab12Cd34Ef56Gh78" });
    bad(widgetConfigQuerySchema, { key: "pk_<script>alert(1)" });
  });
  it("response", () => {
    ok(widgetConfigResponseSchema, { config: DEFAULT_WIDGET_CONFIG });
    bad(widgetConfigResponseSchema, { config: { ...DEFAULT_WIDGET_CONFIG, showBadge: "yes" } });
  });
});

describe("POST /api/widget/chat", () => {
  const valid = { key: KEY, visitorId: "v_12345678", message: "How much is shipping?" };
  it("request: valid", () => {
    ok(chatRequestSchema, valid);
    ok(chatRequestSchema, { ...valid, conversationId: ID });
    ok(chatRequestSchema, { ...valid, message: "a".repeat(MAX_MESSAGE_LENGTH) });
  });
  it("request: invalid", () => {
    bad(chatRequestSchema, { ...valid, message: "a".repeat(MAX_MESSAGE_LENGTH + 1) });
    bad(chatRequestSchema, { ...valid, message: "   " });
    bad(chatRequestSchema, { ...valid, conversationId: "abc" });
    bad(chatRequestSchema, { ...valid, visitorId: "short" });
    bad(chatRequestSchema, { ...valid, visitorId: "has spaces in it" });
    bad(chatRequestSchema, { ...valid, key: undefined });
    bad(chatRequestSchema, { ...valid, extra: true });
  });
  it("response", () => {
    ok(chatResponseSchema, { conversationId: ID, reply: "I don't know." });
    bad(chatResponseSchema, { reply: "hi" });
  });
});

describe("projects", () => {
  it("GET /api/projects response", () => {
    ok(listProjectsResponseSchema, { projects: [project] });
    ok(listProjectsResponseSchema, { projects: [] });
    bad(listProjectsResponseSchema, { projects: [{ ...project, messagesUsed: -1 }] });
  });
  it("POST /api/projects", () => {
    ok(createProjectRequestSchema, { name: "Acme" });
    expect(createProjectRequestSchema.parse({ name: "  Acme  " }).name).toBe("Acme");
    bad(createProjectRequestSchema, { name: "" });
    bad(createProjectRequestSchema, { name: "x".repeat(81) });
    bad(createProjectRequestSchema, { name: "Acme", plan: "pro" });
    ok(createProjectResponseSchema, { project });
    bad(createProjectResponseSchema, { project: { ...project, publicKey: "nope" } });
  });
  it("PATCH /api/projects/:id", () => {
    ok(updateProjectRequestSchema, { name: "New name" });
    bad(updateProjectRequestSchema, {});
    bad(updateProjectRequestSchema, { name: "x", publicKey: KEY });
    ok(updateProjectResponseSchema, { project });
    bad(updateProjectResponseSchema, {});
  });
  it("PATCH /api/projects/:id/config", () => {
    ok(updateWidgetConfigRequestSchema, { buttonColor: "#ff0066" });
    ok(updateWidgetConfigRequestSchema, { position: "top-left", animation: "scale", showBadge: false });
    bad(updateWidgetConfigRequestSchema, {});
    bad(updateWidgetConfigRequestSchema, { buttonColor: "#fff" });
    bad(updateWidgetConfigRequestSchema, { label: "" });
    bad(updateWidgetConfigRequestSchema, { headerText: "x".repeat(81) });
    bad(updateWidgetConfigRequestSchema, { plan: "pro" });
    ok(updateWidgetConfigResponseSchema, { config: DEFAULT_WIDGET_CONFIG });
    bad(updateWidgetConfigResponseSchema, { config: { buttonColor: "#000000" } });
  });
});

describe("knowledge", () => {
  it("POST /api/projects/:id/knowledge", () => {
    ok(pasteKnowledgeRequestSchema, { title: "FAQ", text: "We ship worldwide." });
    bad(pasteKnowledgeRequestSchema, { title: "", text: "x" });
    bad(pasteKnowledgeRequestSchema, { title: "FAQ", text: "  " });
    bad(pasteKnowledgeRequestSchema, { title: "FAQ" });
    ok(pasteKnowledgeResponseSchema, { source: { ...source, type: "text", status: "processing" } });
    bad(pasteKnowledgeResponseSchema, { source: { ...source, status: "done" } });
  });
  it("POST /api/projects/:id/knowledge/upload-url", () => {
    ok(knowledgeUploadUrlRequestSchema, { fileName: "guide.pdf", size: 1024 });
    ok(knowledgeUploadUrlRequestSchema, { title: "Guide", fileName: "notes.md", size: MAX_KNOWLEDGE_FILE_BYTES });
    bad(knowledgeUploadUrlRequestSchema, { fileName: "guide.pdf", size: MAX_KNOWLEDGE_FILE_BYTES + 1 });
    bad(knowledgeUploadUrlRequestSchema, { fileName: "guide.pdf", size: 0 });
    bad(knowledgeUploadUrlRequestSchema, { fileName: "guide.pdf", size: 1.5 });
    bad(knowledgeUploadUrlRequestSchema, { fileName: "sheet.xlsx", size: 1024 });
    bad(knowledgeUploadUrlRequestSchema, { fileName: "", size: 1024 });
    ok(knowledgeUploadUrlResponseSchema, {
      source,
      upload: { signedUrl: "https://x.supabase.co/storage/v1/object/upload/sign/knowledge/a?token=t", path: "a", token: "t" },
    });
    bad(knowledgeUploadUrlResponseSchema, { source, upload: { signedUrl: "not a url", path: "a", token: "t" } });
  });
  it("POST /api/projects/:id/knowledge/finalize", () => {
    ok(finalizeKnowledgeRequestSchema, { sourceId: ID });
    bad(finalizeKnowledgeRequestSchema, { sourceId: "abc" });
    bad(finalizeKnowledgeRequestSchema, {});
    ok(finalizeKnowledgeResponseSchema, { source: { ...source, status: "processing" } });
    bad(finalizeKnowledgeResponseSchema, { source: { ...source, type: "docx" } });
  });
});

describe("conversations", () => {
  it("GET /api/projects/:id/conversations", () => {
    ok(listConversationsResponseSchema, {
      conversations: [{ id: ID, visitorId: "v_12345678", createdAt: NOW, preview: "Hi", messageCount: 2 }],
    });
    ok(listConversationsResponseSchema, {
      conversations: [{ id: ID, visitorId: "v_12345678", createdAt: NOW, preview: null, messageCount: 0 }],
    });
    bad(listConversationsResponseSchema, { conversations: [{ id: ID, createdAt: NOW }] });
  });
  it("GET /api/conversations/:id", () => {
    const conversation = { id: ID, projectId: ID, visitorId: "v_12345678", createdAt: NOW };
    ok(conversationThreadResponseSchema, {
      conversation,
      messages: [
        { id: ID, role: "visitor", body: "Hi", createdAt: NOW },
        { id: ID, role: "bot", body: "Hello!", createdAt: NOW },
      ],
    });
    bad(conversationThreadResponseSchema, {
      conversation,
      messages: [{ id: ID, role: "owner", body: "Hi", createdAt: NOW }],
    });
    bad(conversationThreadResponseSchema, { conversation: { ...conversation, createdAt: "yesterday" }, messages: [] });
  });
});

describe("GET /api/posthog-config", () => {
  it("response", () => {
    ok(posthogConfigResponseSchema, { key: "phc_abc", host: "https://us.i.posthog.com" });
    bad(posthogConfigResponseSchema, { key: "", host: "https://us.i.posthog.com" });
    bad(posthogConfigResponseSchema, { key: "phc_abc", host: "not a url" });
  });
});
