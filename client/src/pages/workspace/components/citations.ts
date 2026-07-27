import type { RetrievedChunk } from "../../../api/types";
import type { CitationLocator } from "../../../store/slices/sourcesSlice";

/** Build the locator used to open a source at the cited chunk, or null if the
 * chunk lacks the identifiers needed to locate it. */
export function chunkToLocator(c: RetrievedChunk): CitationLocator | null {
  if (!c.sourceId || !c.sourceType) return null;
  return {
    sourceId: c.sourceId,
    sourceType: c.sourceType,
    contentUrl: c.contentUrl,
    timestamp: c.timestamp,
    startSeconds: c.startSeconds,
    pageNumber: c.pageNumber,
    chunkText: c.text,
    label: c.label ?? c.sourceName,
  };
}
