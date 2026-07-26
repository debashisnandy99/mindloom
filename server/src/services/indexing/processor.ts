import { prisma } from "../../config/prisma.js";
import type { Source } from "../../generated/prisma/client.js";
import type {
  ChunkMetadata,
  IndexingJobData,
  IndexingProgressEvent,
  IndexingStage,
} from "../../types/indexing.js";
import { childLogger } from "../../utils/logger.js";
import { regenerateNotebookTools } from "../generation/regenerate.js";
import { publishIndexingEvent } from "../sse/sse.service.js";
import { chunkDocument } from "./chunker.js";
import { embedTexts } from "./embedder.js";
import { extractSource } from "./extractors/index.js";
import { deleteSourceVectors, upsertChunks } from "./vectorStore.js";

const log = childLogger("indexing");

const MAX_EXCERPTS = 3;
const MAX_KEY_POINTS = 3;

function progress(
  data: IndexingJobData,
  stage: IndexingStage,
  percent: number,
  extra: Partial<IndexingProgressEvent> = {},
): Promise<void> {
  return publishIndexingEvent({
    sourceId: data.sourceId,
    notebookId: data.notebookId,
    status: stage === "completed" ? "INDEXED" : stage === "failed" ? "FAILED" : "PROCESSING",
    stage,
    progress: percent,
    at: new Date().toISOString(),
    ...extra,
  });
}

/** Cheap, deterministic previews for the source viewer. No model calls. */
function derivePreviews(text: string): { keyPoints: string[]; excerpts: string[] } {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 80);

  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 240);

  return {
    keyPoints: sentences.slice(0, MAX_KEY_POINTS),
    excerpts: paragraphs.slice(0, MAX_EXCERPTS).map((p) => (p.length > 600 ? `${p.slice(0, 600)}…` : p)),
  };
}

export async function processIndexingJob(data: IndexingJobData): Promise<void> {
  const { sourceId, notebookId } = data;

  const source: Source | null = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    log.warn({ sourceId }, "source disappeared before indexing, skipping");
    return;
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: "PROCESSING", errorMessage: null },
  });
  await progress(data, "extracting", 10, { message: "Reading source" });

  try {
    const document = await extractSource(source);
    await progress(data, "chunking", 30, { message: "Splitting into chunks" });

    const chunks: ChunkMetadata[] = await chunkDocument({
      document,
      sourceId,
      sourceName: source.name,
      sourceType: source.type,
      notebookId,
    });

    if (chunks.length === 0) throw new Error("Source produced no indexable content");

    await progress(data, "embedding", 50, {
      message: `Embedding ${chunks.length} chunks`,
      chunkCount: chunks.length,
    });
    const vectors = await embedTexts(chunks.map((c) => c.text));

    await progress(data, "storing", 85, { message: "Storing vectors" });
    // Clear any vectors from a previous run so a re-index cannot duplicate.
    await deleteSourceVectors(notebookId, sourceId);
    await upsertChunks(notebookId, chunks, vectors);

    const fullText = document.segments.map((s) => s.text).join("\n\n");
    const { keyPoints, excerpts } = derivePreviews(fullText);

    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: "INDEXED",
        chunkCount: chunks.length,
        indexedAt: new Date(),
        errorMessage: null,
        meta: source.meta || document.meta,
        keyPoints,
        excerpts,
      },
    });

    await progress(data, "completed", 100, {
      message: "Indexing complete",
      chunkCount: chunks.length,
    });
    log.info({ sourceId, chunks: chunks.length }, "indexed source");

    // Fresh content: regenerate every study tool for the notebook. Coalesced
    // per tool, so several sources finishing together produce one job each.
    await regenerateNotebookTools(notebookId, data.userId).catch((err) =>
      log.warn({ err, notebookId }, "failed to queue tool regeneration"),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown indexing error";
    log.error({ err, sourceId }, "indexing failed");

    await prisma.source.update({
      where: { id: sourceId },
      data: { status: "FAILED", errorMessage: message },
    });
    await progress(data, "failed", 100, { error: message, message: "Indexing failed" });

    throw err;
  }
}
