import { env } from "../../env.js";
import type {
  QueryAnswer,
  RetrievalResult,
  RetrievedChunk,
} from "../../types/indexing.js";
import { childLogger } from "../../utils/logger.js";
import { embedTexts } from "../indexing/embedder.js";
import { searchChunks } from "../indexing/vectorStore.js";
import {
  generateGroundedAnswer,
  streamGroundedAnswer,
  NO_CONTEXT_MESSAGE,
} from "../generation/answer.service.js";
import { rewriteQuery, rewriteVariants } from "./queryRewriter.js";

const log = childLogger("retrieval");

export interface RetrievalOptions {
  topK?: number;
  /** Restrict the search to a subset of the notebook's sources. */
  sourceIds?: string[];
}

/** Rank constant for Reciprocal Rank Fusion; 60 is the value from the paper. */
const RRF_K = 60;

/**
 * Fuses the per-variant result lists with Reciprocal Rank Fusion. RRF ranks by
 * position rather than raw score, so the three query variants — which produce
 * similarity scores on different scales — can be combined without normalising.
 * Each chunk keeps its best raw score for the relevance threshold and for
 * display as a citation confidence.
 */
function fuse(lists: RetrievedChunk[][]): RetrievedChunk[] {
  const scores = new Map<string, number>();
  const best = new Map<string, RetrievedChunk>();

  for (const list of lists) {
    list.forEach((chunk, rank) => {
      scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + 1 / (RRF_K + rank + 1));

      const existing = best.get(chunk.id);
      if (!existing || chunk.score > existing.score) best.set(chunk.id, chunk);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => best.get(id)!)
    .filter(Boolean);
}

/**
 * Rewrite → embed every variant → search Qdrant per variant → fuse → threshold.
 *
 * The rewrite widens recall; the threshold is what keeps an off-topic question
 * from dredging up loosely-related chunks and being answered anyway.
 */
export async function retrieveWithRewrite(
  notebookId: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const topK = options.topK ?? env.RETRIEVAL_TOP_K;

  const rewrite = await rewriteQuery(query);
  const variants = rewriteVariants(rewrite);

  // One batched embedding call covers all variants.
  const vectors = await embedTexts(variants);

  const lists = await Promise.all(
    vectors.map((vector) =>
      searchChunks(notebookId, vector, env.RETRIEVAL_CANDIDATES, options.sourceIds),
    ),
  );

  const fused = fuse(lists);
  const relevant = fused
    .filter((chunk) => chunk.score >= env.RETRIEVAL_MIN_SCORE)
    .slice(0, topK);

  log.debug(
    {
      notebookId,
      variants: variants.length,
      candidates: fused.length,
      kept: relevant.length,
      topScore: fused[0]?.score ?? null,
    },
    "retrieval complete",
  );

  return { chunks: relevant, found: relevant.length > 0, rewrite };
}

/**
 * Embed the query, search the notebook's Qdrant collection and rerank.
 * Returns the fused chunk list only — used by the raw `/search` endpoint.
 */
export async function retrieveRelevantChunks(
  notebookId: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievedChunk[]> {
  const { chunks } = await retrieveWithRewrite(notebookId, query, options);
  return chunks;
}

/** Run RAG generation over the retrieved chunks and return cited prose. */
export async function answerQuery(
  notebookId: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<QueryAnswer> {
  const { chunks, found } = await retrieveWithRewrite(notebookId, query, options);

  // Nothing relevant in the notebook: say so instead of asking the model to
  // improvise an answer it has no grounding for.
  if (!found) {
    return { answer: NO_CONTEXT_MESSAGE, citations: [], grounded: false };
  }

  const answer = await generateGroundedAnswer(query, chunks);
  return { answer, citations: chunks, grounded: true };
}

/** Stream the same answer token by token for the chat UI. */
export async function* streamAnswer(
  notebookId: string,
  query: string,
  options: RetrievalOptions = {},
): AsyncGenerator<string, void, unknown> {
  const { chunks, found } = await retrieveWithRewrite(notebookId, query, options);

  if (!found) {
    yield NO_CONTEXT_MESSAGE;
    return;
  }

  yield* streamGroundedAnswer(query, chunks);
}
