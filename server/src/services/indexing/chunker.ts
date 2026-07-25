import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { env } from "../../env.js";
import type { SourceType } from "../../generated/prisma/enums.js";
import type {
  ChunkMetadata,
  ExtractedDocument,
  SegmentMetadata,
} from "../../types/indexing.js";

export interface ChunkInput {
  document: ExtractedDocument;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  notebookId: string;
}

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: env.CHUNK_SIZE,
  chunkOverlap: env.CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
});

function normalise(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Splits every segment into overlapping chunks, preserving each segment's
 * locator (page number, timestamp) in the chunk payload. Each chunk is
 * prefixed with a source header so a chunk retrieved on its own still
 * carries the context of where it came from.
 */
export async function chunkDocument(input: ChunkInput): Promise<ChunkMetadata[]> {
  const { document, sourceId, sourceName, sourceType, notebookId } = input;

  const header = `Source: ${sourceName} (${sourceType})`;
  const chunks: ChunkMetadata[] = [];

  for (const segment of document.segments) {
    const text = normalise(segment.text);
    if (!text) continue;

    const pieces = await splitter.splitText(text);
    const locator: SegmentMetadata = { ...document.metadata, ...segment.metadata };

    for (const piece of pieces) {
      chunks.push({
        ...locator,
        sourceId,
        notebookId,
        sourceName,
        sourceType,
        chunkIndex: chunks.length,
        totalChunks: 0,
        text: `${header}\n\n${piece}`,
      });
    }
  }

  for (const chunk of chunks) chunk.totalChunks = chunks.length;

  return chunks;
}
