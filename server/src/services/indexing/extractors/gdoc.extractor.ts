import type { ExtractedDocument } from "../../../types/indexing.js";
import { extractUrl } from "./url.extractor.js";

const FETCH_TIMEOUT_MS = 20_000;

export function parseGoogleDocId(url: string): string | null {
  return url.match(/\/document\/d\/([\w-]+)/)?.[1] ?? null;
}

/**
 * Reads a Google Doc through its plain-text export endpoint, which works for
 * any doc shared as "anyone with the link". Private docs would require an
 * OAuth token with Drive scope, which the sign-in flow does not request.
 */
export async function extractGoogleDoc(url: string): Promise<ExtractedDocument> {
  const docId = parseGoogleDocId(url);
  if (!docId) {
    // Published-to-web docs use a /d/e/ link that has no extractable id.
    return extractUrl(url);
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "This Google Doc is private. Share it with 'anyone with the link' and try again.",
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Doc: ${response.status} ${response.statusText}`);
  }

  const text = (await response.text()).replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("This Google Doc appears to be empty");

  return {
    segments: [{ text, metadata: {} }],
    metadata: { docId, url },
    meta: `Google Doc · ${Math.max(1, Math.round(text.split(/\s+/).length / 250))} min read`,
  };
}
