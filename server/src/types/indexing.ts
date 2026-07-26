import type { SourceType } from "../generated/prisma/enums.js";

export const INDEXING_QUEUE = "source-indexing";

export interface IndexingJobData {
  sourceId: string;
  notebookId: string;
  userId: string;
}

export type IndexingStage =
  | "queued"
  | "extracting"
  | "chunking"
  | "embedding"
  | "storing"
  | "completed"
  | "failed";

export interface IndexingProgressEvent {
  sourceId: string;
  notebookId: string;
  status: "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";
  stage: IndexingStage;
  /** 0-100 */
  progress: number;
  message?: string;
  chunkCount?: number;
  error?: string;
  at: string;
}

export type SegmentMetadata = Record<string, string | number | boolean>;

/**
 * A contiguous piece of a source with its own locator, e.g. one PDF page or
 * one transcript window. Keeping segments separate preserves page numbers
 * and timestamps for citations instead of flattening them away.
 */
export interface ExtractedSegment {
  text: string;
  metadata: SegmentMetadata;
}

export interface ExtractedDocument {
  segments: ExtractedSegment[];
  /** Merged into every chunk payload, e.g. page count or video id. */
  metadata: SegmentMetadata;
  /** Short human-readable descriptor shown in the UI, e.g. "PDF · 42 pages". */
  meta: string;
}

export interface ChunkMetadata {
  sourceId: string;
  notebookId: string;
  sourceName: string;
  sourceType: SourceType;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  [key: string]: string | number | boolean;
}

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  sourceId: string;
  sourceName: string;
  sourceType?: SourceType;
  chunkIndex: number;
  /** YouTube transcript window start, e.g. "2:34". From Qdrant payload. */
  timestamp?: string;
  /** YouTube window start in seconds — useful for deep links. */
  startSeconds?: number;
  /** PDF page number when the chunk came from a paginated source. */
  pageNumber?: number;
  /** Source.content snapshot — YT/URL/GDOC URL (PDF uses GET /sources/:id for download). */
  contentUrl?: string;
  /** Chip label shown in the chat UI, e.g. "Lecture · 2:34". */
  label?: string;
}

export interface QueryAnswer {
  answer: string;
  citations: RetrievedChunk[];
  /** False when retrieval found nothing relevant, so no model was consulted. */
  grounded: boolean;
}

/**
 * Output of the pre-retrieval rewrite step. Both variants are internal: they
 * widen recall against the vector store and are never shown to the user.
 */
export interface RewrittenQuery {
  /** The user's original wording, kept verbatim. */
  original: string;
  /** Same intent, phrased the way a source document would state it. */
  rephrased: string;
  /** A broader "step back" question about the underlying concept. */
  stepBack: string;
}

/** Retrieval outcome, before any generation happens. */
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** True when at least one chunk cleared the relevance threshold. */
  found: boolean;
  /** The rewrite that produced these chunks — logged, never sent to clients. */
  rewrite: RewrittenQuery;
}
