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
  chunkIndex: number;
}

export interface QueryAnswer {
  answer: string;
  citations: RetrievedChunk[];
}
