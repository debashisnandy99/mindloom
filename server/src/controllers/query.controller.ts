import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  NO_CONTEXT_MESSAGE,
  streamGroundedAnswer,
} from "../services/generation/answer.service.js";
import {
  answerQuery,
  retrieveRelevantChunks,
  retrieveWithRewrite,
} from "../services/retrieval/retrieval.service.js";
import type { RetrievedChunk } from "../types/indexing.js";
import { ApiError } from "../utils/ApiError.js";
import { sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { childLogger } from "../utils/logger.js";
import type { CreateQueryBody } from "../validators/query.schema.ts";

const log = childLogger("query");

export const listQueries = asyncHandler(async (req, res) => {
  const queries = await prisma.query.findMany({
    where: { notebookId: req.notebook!.id },
    orderBy: { createdAt: "asc" },
    include: {
      queryToSources: {
        include: { source: { select: { id: true, name: true } } },
      },
    },
  });
  sendSuccess(res, { queries });
});

/**
 * `QueryToSource` is unique on `(queryId, sourceId)`, but several retrieved
 * chunks routinely come from the same source. Collapse them to one link per
 * source, keeping the best-scoring chunk as the stored excerpt.
 */
function toSourceLinks(citations: RetrievedChunk[]) {
  const bySource = new Map<string, RetrievedChunk>();

  for (const chunk of citations) {
    if (!chunk.sourceId) continue;
    const existing = bySource.get(chunk.sourceId);
    if (!existing || chunk.score > existing.score) bySource.set(chunk.sourceId, chunk);
  }

  return [...bySource.values()].map((chunk) => ({
    sourceId: chunk.sourceId,
    score: chunk.score,
    chunkText: chunk.text,
  }));
}

function persistQuery(notebookId: string, query: string, answer: string, citations: RetrievedChunk[]) {
  return prisma.query.create({
    data: {
      notebookId,
      query,
      answer: answer || null,
      query_type: "USER",
      queryToSources: { create: toSourceLinks(citations) },
    },
    include: { queryToSources: true },
  });
}

/**
 * Persists the question and returns the grounded answer. Retrieval rewrites the
 * query internally (rephrase + step back) before searching; when nothing clears
 * the relevance threshold the answer is the fixed "not in your sources" message
 * and no generation happens.
 */
export const ask = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  const { query, sourceIds, topK } = req.body as CreateQueryBody;

  const result = await answerQuery(notebookId, query, { sourceIds, topK });
  const record = await persistQuery(notebookId, query, result.answer, result.citations);

  sendSuccess(res, {
    query: record,
    answer: result.answer,
    citations: result.citations,
    grounded: result.grounded,
  });
});

/**
 * Streaming variant of `ask`, framed as SSE over a POST body.
 *
 * Event order is always: `meta` (citations + whether anything was found) →
 * zero or more `delta` (text fragments) → `done` (persisted query id and the
 * assembled answer). Errors after the headers are sent arrive as an `error`
 * event, since the status code is already committed by then.
 *
 * The internal rewrite is used for retrieval only and is never emitted.
 */
export const askStream = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  const { query, sourceIds, topK } = req.body as CreateQueryBody;

  // Retrieval happens before the stream opens so a failure here can still be a
  // normal JSON error response rather than a half-written stream.
  const { chunks, found } = await retrieveWithRewrite(notebookId, query, {
    sourceIds,
    topK,
  });

  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Stop generating if the user navigates away mid-answer.
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  send("meta", { found, citations: chunks });

  let answer = "";

  try {
    if (!found) {
      answer = NO_CONTEXT_MESSAGE;
      send("delta", { text: answer });
    } else {
      for await (const delta of streamGroundedAnswer(query, chunks, abort.signal)) {
        answer += delta;
        send("delta", { text: delta });
      }
    }

    // A client that disconnected mid-stream gets nothing persisted; a partial
    // answer is not worth writing to their history.
    if (abort.signal.aborted) return res.end();

    const record = await persistQuery(notebookId, query, answer, found ? chunks : []);
    send("done", { queryId: record.id, answer, grounded: found });
  } catch (err) {
    if (abort.signal.aborted) return res.end();
    log.error({ err, notebookId }, "streaming answer failed");
    send("error", {
      message: err instanceof ApiError ? err.message : "Failed to generate an answer",
    });
  }

  res.end();
});

export const search = asyncHandler(async (req, res) => {
  const { query, sourceIds, topK } = req.body as CreateQueryBody;
  const chunks = await retrieveRelevantChunks(req.notebook!.id, query, {
    sourceIds,
    topK,
  });
  sendSuccess(res, { chunks });
});

export const deleteQuery = asyncHandler(async (req, res) => {
  // Scoping the delete by notebook stops a caller removing another
  // notebook's query by guessing its id.
  const result = await prisma.query.deleteMany({
    where: { id: req.params.queryId, notebookId: req.notebook!.id },
  });
  if (result.count === 0) throw ApiError.notFound("Query not found");
  sendNoContent(res);
});
