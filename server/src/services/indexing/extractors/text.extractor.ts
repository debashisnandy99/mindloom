import type { ExtractedDocument } from "../../../types/indexing.js";

export function extractText(content: string): ExtractedDocument {
  const text = content.replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("Text source is empty");

  const words = text.split(/\s+/).length;

  return {
    segments: [{ text, metadata: {} }],
    metadata: { wordCount: words },
    meta: `Text · ${words} word${words === 1 ? "" : "s"}`,
  };
}
