import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  answerQuery,
  retrieveRelevantChunks,
} from "../services/retrieval/retrieval.service.js";
import { ApiError } from "../utils/ApiError.js";
import { sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import type { CreateQueryBody } from "../validators/query.schema.ts";

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
 * Persists the question and returns whatever the retrieval layer produces.
 * The RAG implementation behind `answerQuery` is still a stub, so answers
 * come back empty until it is filled in.
 */
export const ask = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  const { query, sourceIds, topK } = req.body as CreateQueryBody;

  const result = await answerQuery(notebookId, query, { sourceIds, topK });

  const record = await prisma.query.create({
    data: {
      notebookId,
      query,
      answer: result.answer || null,
      query_type: "USER",
      queryToSources: {
        create: result.citations.map((c) => ({
          sourceId: c.sourceId,
          score: c.score,
          chunkText: c.text,
        })),
      },
    },
    include: { queryToSources: true },
  });

  sendSuccess(res, {
    query: record,
    answer: result.answer,
    citations: result.citations,
  });
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
