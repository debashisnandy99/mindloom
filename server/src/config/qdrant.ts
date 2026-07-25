import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../env.js";

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY || undefined,
  checkCompatibility: false,
});

/** One collection per notebook keeps deletes and per-notebook search cheap. */
export function collectionName(notebookId: string): string {
  return `notebook_${notebookId.replace(/-/g, "")}`;
}
