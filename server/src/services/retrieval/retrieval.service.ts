import type { QueryAnswer, RetrievedChunk } from "../../types/indexing.js";

export interface RetrievalOptions {
  topK?: number;
  /** Restrict the search to a subset of the notebook's sources. */
  sourceIds?: string[];
}

/**
 * Embed the query, search the notebook's Qdrant collection and rerank.
 *
 * Intentionally left unimplemented; the vector store already exposes
 * `searchChunks` and `embedQuery` for when this is wired up.
 */
export async function retrieveRelevantChunks(
  _notebookId: string,
  _query: string,
  _options: RetrievalOptions = {},
): Promise<RetrievedChunk[]> {
  // TODO: embed query, search Qdrant, rerank
  return [];
}

/** Run RAG generation over the retrieved chunks and return cited prose. */
export async function answerQuery(
  _notebookId: string,
  _query: string,
  _options: RetrievalOptions = {},
): Promise<QueryAnswer> {
  // TODO: RAG generation with citations
  return { answer: "", citations: [] };
}

/** Stream the same answer token by token for the chat UI. */
export async function* streamAnswer(
  _notebookId: string,
  _query: string,
  _options: RetrievalOptions = {},
): AsyncGenerator<string, void, unknown> {
  // TODO: stream RAG generation
}
