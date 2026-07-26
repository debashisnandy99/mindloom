import { createXai } from "@ai-sdk/xai";
import { generateText, streamText } from "ai";
import { env } from "../../env.js";
import type { RetrievedChunk } from "../../types/indexing.js";
import { ApiError } from "../../utils/ApiError.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("generation");

/**
 * Returned verbatim when retrieval finds nothing above the relevance
 * threshold. Kept as a constant so the API, the stream and the client all
 * agree on the exact wording.
 */
export const NO_CONTEXT_MESSAGE =
  "I couldn't find anything about that in your sources. Try rephrasing the question, or add a source that covers it.";

const SYSTEM_PROMPT = `You are Mindloom, a research assistant that answers strictly from the user's own sources.

Rules:
- Use ONLY the numbered context passages provided. They are the complete set of information available to you.
- Cite the passages you used with bracketed numbers matching the context, e.g. [1] or [2][3], at the end of the sentence the passage supports. The client turns these into clickable chips — do not invent timestamps, page numbers, or URLs in the prose.
- If the passages do not contain enough information to answer, say so plainly and state what is missing. Never fill the gap with outside knowledge.
- Never invent citations, quotes, page numbers, or timestamps.
- Be direct and concise. Prefer short paragraphs and bullet lists. Do not restate the question.
- When passages disagree, say so and attribute each position to its citation.`;

let provider: ReturnType<typeof createXai> | undefined;

/** Lazily builds the xAI provider so a missing key fails per-request, not at boot. */
function getModel() {
  if (!env.XAI_API_KEY) {
    throw ApiError.internal(
      "Answer generation is not configured: set XAI_API_KEY in the server environment",
    );
  }

  provider ??= createXai({
    apiKey: env.XAI_API_KEY,
    ...(env.XAI_BASE_URL ? { baseURL: env.XAI_BASE_URL } : {}),
  });

  return provider(env.XAI_MODEL);
}

/**
 * Locator line for a passage — YouTube timestamps and PDF pages come from the
 * Qdrant payload written at index time (not invented at answer time).
 */
function locatorFor(chunk: RetrievedChunk): string {
  if (chunk.sourceType === "YT") {
    const stamp =
      chunk.timestamp ??
      (typeof chunk.startSeconds === "number"
        ? formatSeconds(chunk.startSeconds)
        : undefined);
    return stamp
      ? `Source: ${chunk.sourceName} (YouTube @ ${stamp})`
      : `Source: ${chunk.sourceName} (YouTube)`;
  }

  if (chunk.sourceType === "PDF" && typeof chunk.pageNumber === "number") {
    return `Source: ${chunk.sourceName} (PDF · page ${chunk.pageNumber})`;
  }

  return `Source: ${chunk.sourceName}`;
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Renders the retrieved chunks as numbered context blocks. The numbering is
 * what the model cites, and it matches the order of the citation array sent to
 * the client, so `[2]` in the prose maps to `citations[1]`.
 */
function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => `[${i + 1}] ${locatorFor(chunk)}\n${chunk.text}`)
    .join("\n\n---\n\n");
}

function buildPrompt(query: string, chunks: RetrievedChunk[]): string {
  return `Context passages from the user's sources:\n\n${buildContext(chunks)}\n\n---\n\nQuestion: ${query}`;
}

/** Non-streaming grounded answer. */
export async function generateGroundedAnswer(
  query: string,
  chunks: RetrievedChunk[],
): Promise<string> {
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(query, chunks),
    temperature: 0.2,
  });

  log.debug(
    { chunks: chunks.length, chars: result.text.length },
    "generated answer",
  );
  return result.text;
}

/**
 * Streams the grounded answer as text deltas. The caller owns framing these
 * into whatever transport it uses (SSE, websocket, …) and may pass an
 * `AbortSignal` so a disconnecting client stops the upstream generation.
 */
export async function* streamGroundedAnswer(
  query: string,
  chunks: RetrievedChunk[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  // `streamText` does not reject: a provider or transport failure ends the
  // text stream and is reported through `onError` instead. Without capturing
  // it here a failed generation would look like a successful empty answer, so
  // the error is stashed and rethrown once the stream closes.
  let streamError: unknown;

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(query, chunks),
    temperature: 0.2,
    onError: ({ error }) => {
      streamError = error;
    },
    ...(signal ? { abortSignal: signal } : {}),
  });

  for await (const delta of result.textStream) {
    yield delta;
  }

  if (streamError) {
    log.error({ err: streamError }, "xai generation failed mid-stream");
    throw streamError instanceof Error
      ? streamError
      : new Error(String(streamError));
  }
}
