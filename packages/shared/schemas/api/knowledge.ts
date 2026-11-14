// Owner routes: knowledge sources (§6.4, §8 Owner, §9 File upload).
import { z } from "zod";
import { knowledgeSourceStatusSchema, knowledgeSourceTypeSchema } from "../enums";
import {
  MAX_FILE_NAME_LENGTH,
  MAX_KNOWLEDGE_FILE_BYTES,
  MAX_KNOWLEDGE_TEXT_LENGTH,
  MAX_KNOWLEDGE_TITLE_LENGTH,
  knowledgeFileTypeFromName,
} from "../../limits";
import { idSchema, timestampSchema } from "./common";

export const knowledgeSourceSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string(),
  type: knowledgeSourceTypeSchema,
  status: knowledgeSourceStatusSchema,
  createdAt: timestampSchema,
});
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

const titleSchema = z.string().trim().min(1, "Title is required").max(MAX_KNOWLEDGE_TITLE_LENGTH);

// POST /api/projects/:id/knowledge (paste text)
export const pasteKnowledgeRequestSchema = z.strictObject({
  title: titleSchema,
  text: z.string().trim().min(1, "Text is empty").max(MAX_KNOWLEDGE_TEXT_LENGTH),
});
export type PasteKnowledgeRequest = z.infer<typeof pasteKnowledgeRequestSchema>;
export const pasteKnowledgeResponseSchema = z.object({ source: knowledgeSourceSchema });
export type PasteKnowledgeResponse = z.infer<typeof pasteKnowledgeResponseSchema>;

// POST /api/projects/:id/knowledge/upload-url
// Declared name and size are checked here; the real size and bytes at finalize.
export const knowledgeUploadUrlRequestSchema = z.strictObject({
  /** Defaults to the file name when omitted. */
  title: titleSchema.optional(),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(MAX_FILE_NAME_LENGTH)
    .refine((name) => knowledgeFileTypeFromName(name) !== null, "Only PDF, Markdown and TXT files are allowed"),
  /** Declared size in bytes. */
  size: z.int().positive().max(MAX_KNOWLEDGE_FILE_BYTES, "File is larger than 10 MB"),
});
export type KnowledgeUploadUrlRequest = z.infer<typeof knowledgeUploadUrlRequestSchema>;

export const knowledgeUploadUrlResponseSchema = z.object({
  /** The reserved source, status `uploading`. */
  source: knowledgeSourceSchema,
  /** One-time signed upload: pass to Storage's `uploadToSignedUrl(path, token, file)`. */
  upload: z.object({
    signedUrl: z.url(),
    path: z.string().min(1),
    token: z.string().min(1),
  }),
});
export type KnowledgeUploadUrlResponse = z.infer<typeof knowledgeUploadUrlResponseSchema>;

// POST /api/projects/:id/knowledge/finalize
export const finalizeKnowledgeRequestSchema = z.strictObject({ sourceId: idSchema });
export type FinalizeKnowledgeRequest = z.infer<typeof finalizeKnowledgeRequestSchema>;
export const finalizeKnowledgeResponseSchema = z.object({ source: knowledgeSourceSchema });
export type FinalizeKnowledgeResponse = z.infer<typeof finalizeKnowledgeResponseSchema>;

// DELETE /api/knowledge/:id → DeleteResponse (./common)
