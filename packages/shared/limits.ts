// Input limits enforced on the server (project.md §6.4, §6.6, §9).
import type { KnowledgeSourceType } from "./enums";

/** Max characters in one visitor chat message (§6.6). */
export const MAX_MESSAGE_LENGTH = 1000;

/** Max size of an uploaded knowledge file: 10 MB (§6.4). The bucket enforces the same. */
export const MAX_KNOWLEDGE_FILE_BYTES = 10 * 1024 * 1024;

/** Max characters of pasted knowledge text. Keeps the body well under Vercel's 4.5 MB cap. */
export const MAX_KNOWLEDGE_TEXT_LENGTH = 200_000;

export const MAX_PROJECT_NAME_LENGTH = 80;
export const MAX_KNOWLEDGE_TITLE_LENGTH = 200;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_WIDGET_LABEL_LENGTH = 40;
export const MAX_WIDGET_HEADER_LENGTH = 80;
export const MAX_VISITOR_ID_LENGTH = 128;

/** File source types, by allowed extension. Pasted text is type `text`. */
export const KNOWLEDGE_FILE_EXTENSIONS = {
  pdf: "pdf",
  md: "md",
  markdown: "md",
  txt: "txt",
} as const satisfies Record<string, Exclude<KnowledgeSourceType, "text">>;

export type KnowledgeFileType = (typeof KNOWLEDGE_FILE_EXTENSIONS)[keyof typeof KNOWLEDGE_FILE_EXTENSIONS];

/** MIME types the `knowledge` bucket accepts, per file type. */
export const KNOWLEDGE_FILE_MIME_TYPES = {
  pdf: "application/pdf",
  md: "text/markdown",
  txt: "text/plain",
} as const satisfies Record<KnowledgeFileType, string>;

/** The knowledge file type for a file name, or null if the extension isn't allowed. */
export function knowledgeFileTypeFromName(fileName: string): KnowledgeFileType | null {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return Object.hasOwn(KNOWLEDGE_FILE_EXTENSIONS, ext)
    ? KNOWLEDGE_FILE_EXTENSIONS[ext as keyof typeof KNOWLEDGE_FILE_EXTENSIONS]
    : null;
}
