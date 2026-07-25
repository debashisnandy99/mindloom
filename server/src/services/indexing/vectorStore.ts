import { randomUUID } from "node:crypto";
import { collectionName, qdrant } from "../../config/qdrant.js";
import { env } from "../../env.js";
import type { ChunkMetadata, RetrievedChunk } from "../../types/indexing.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("qdrant");

/** Creates the notebook's collection on first use. Safe to call repeatedly. */
export async function ensureCollection(notebookId: string): Promise<string> {
  const name = collectionName(notebookId);

  const exists = await qdrant.collectionExists(name);
  if (exists.exists) return name;

  await qdrant.createCollection(name, {
    vectors: { size: env.EMBEDDING_DIMENSIONS, distance: "Cosine" },
    optimizers_config: { default_segment_number: 2 },
  });

  // Indexed payload keys make per-source filtering and deletion fast.
  await qdrant.createPayloadIndex(name, { field_name: "sourceId", field_schema: "keyword" });

  log.info({ collection: name }, "created qdrant collection");
  return name;
}

export async function upsertChunks(
  notebookId: string,
  chunks: ChunkMetadata[],
  vectors: number[][],
): Promise<void> {
  if (chunks.length === 0) return;
  const name = await ensureCollection(notebookId);

  await qdrant.upsert(name, {
    wait: true,
    points: chunks.map((chunk, i) => ({
      id: randomUUID(),
      vector: vectors[i],
      payload: chunk as Record<string, unknown>,
    })),
  });

  log.debug({ collection: name, points: chunks.length }, "upserted chunks");
}

/** Removes every vector belonging to one source, e.g. before a re-index. */
export async function deleteSourceVectors(
  notebookId: string,
  sourceId: string,
): Promise<void> {
  const name = collectionName(notebookId);
  const exists = await qdrant.collectionExists(name);
  if (!exists.exists) return;

  await qdrant.delete(name, {
    wait: true,
    filter: { must: [{ key: "sourceId", match: { value: sourceId } }] },
  });
}

export async function deleteNotebookCollection(notebookId: string): Promise<void> {
  const name = collectionName(notebookId);
  const exists = await qdrant.collectionExists(name);
  if (exists.exists) await qdrant.deleteCollection(name);
}

/**
 * Best-effort variants for delete paths. A user removing a notebook or source
 * should not be blocked by an unreachable Qdrant; the rows go away and the
 * orphaned vectors can be swept later.
 */
export async function tryDeleteNotebookCollection(notebookId: string): Promise<void> {
  try {
    await deleteNotebookCollection(notebookId);
  } catch (err) {
    log.warn({ err, notebookId }, "failed to delete qdrant collection");
  }
}

export async function tryDeleteSourceVectors(
  notebookId: string,
  sourceId: string,
): Promise<void> {
  try {
    await deleteSourceVectors(notebookId, sourceId);
  } catch (err) {
    log.warn({ err, notebookId, sourceId }, "failed to delete source vectors");
  }
}

export async function searchChunks(
  notebookId: string,
  vector: number[],
  topK: number,
  sourceIds?: string[],
): Promise<RetrievedChunk[]> {
  const name = collectionName(notebookId);
  const exists = await qdrant.collectionExists(name);
  if (!exists.exists) return [];

  const result = await qdrant.search(name, {
    vector,
    limit: topK,
    with_payload: true,
    filter: sourceIds?.length
      ? { must: [{ key: "sourceId", match: { any: sourceIds } }] }
      : undefined,
  });

  return result.map((point) => {
    const payload = (point.payload ?? {}) as Partial<ChunkMetadata>;
    return {
      id: String(point.id),
      score: point.score,
      text: payload.text ?? "",
      sourceId: payload.sourceId ?? "",
      sourceName: payload.sourceName ?? "",
      chunkIndex: payload.chunkIndex ?? 0,
    };
  });
}
