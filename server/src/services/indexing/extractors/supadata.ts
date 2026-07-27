import { env } from "../../../env.js";
import { childLogger } from "../../../utils/logger.js";

const log = childLogger("supadata");

/** Normalized transcript cue, times in seconds. */
export interface TranscriptCue {
  text: string;
  offsetSeconds: number;
  durationSeconds: number;
}

/** Thrown when Supadata is certain the video has no captions and none can be generated. */
export class TranscriptUnavailableError extends Error {
  constructor(message = "This video has no transcript available") {
    super(message);
    this.name = "TranscriptUnavailableError";
  }
}

interface SupadataChunk {
  text: string;
  offset: number; // milliseconds
  duration: number; // milliseconds
  lang?: string;
}

interface SupadataResult {
  content: SupadataChunk[] | string;
  lang?: string;
  availableLangs?: string[];
}

interface SupadataJob extends Partial<SupadataResult> {
  status: "queued" | "active" | "completed" | "failed";
  error?: unknown;
}

// Async jobs (used for longer videos and ASR generation) are polled until done.
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

function authHeaders(): Record<string, string> {
  if (!env.SUPADATA_API_KEY) {
    throw new Error("SUPADATA_API_KEY is not configured");
  }
  return { "x-api-key": env.SUPADATA_API_KEY };
}

function toCues(content: SupadataChunk[]): TranscriptCue[] {
  return content.map((c) => ({
    text: c.text,
    offsetSeconds: c.offset / 1000,
    durationSeconds: c.duration / 1000,
  }));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a YouTube transcript through Supadata, which proxies the request so it
 * works from datacenter IPs (and can generate captions via ASR when the video
 * has none). Returns timestamped cues normalized to seconds.
 */
export async function fetchSupadataTranscript(
  url: string,
): Promise<TranscriptCue[]> {
  const params = new URLSearchParams({
    url,
    text: "false", // keep timestamps for citation offsets
    mode: env.SUPADATA_TRANSCRIPT_MODE,
  });
  const endpoint = `${env.SUPADATA_BASE_URL}/transcript?${params.toString()}`;

  const res = await fetch(endpoint, { headers: authHeaders() });

  if (res.status === 200) {
    const body = (await res.json()) as SupadataResult;
    return resultToCues(body);
  }

  if (res.status === 202) {
    const { jobId } = (await res.json()) as { jobId: string };
    log.debug({ jobId, url }, "supadata transcript queued, polling");
    return pollJob(jobId);
  }

  throw mapErrorStatus(res.status, await safeText(res));
}

async function pollJob(jobId: string): Promise<TranscriptCue[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(`${env.SUPADATA_BASE_URL}/transcript/${jobId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw mapErrorStatus(res.status, await safeText(res));

    const job = (await res.json()) as SupadataJob;
    if (job.status === "completed") return resultToCues(job as SupadataResult);
    if (job.status === "failed") {
      const detail =
        typeof job.error === "string"
          ? job.error
          : JSON.stringify(job.error ?? {});
      throw new Error(`Supadata transcript job failed: ${detail}`);
    }
    // queued | active → keep polling
  }

  throw new Error(
    `Supadata transcript job ${jobId} did not finish within ${POLL_TIMEOUT_MS / 1000}s`,
  );
}

function resultToCues(body: SupadataResult): TranscriptCue[] {
  if (!Array.isArray(body.content)) {
    // text=false should always yield an array; a string means an unexpected shape.
    throw new Error("Supadata returned a non-timestamped transcript");
  }
  if (body.content.length === 0) throw new TranscriptUnavailableError();
  return toCues(body.content);
}

function mapErrorStatus(status: number, detail: string): Error {
  switch (status) {
    case 206:
      // transcript-unavailable: no captions and none could be generated.
      return new TranscriptUnavailableError();
    case 404:
      return new Error("This YouTube video is unavailable or private");
    case 401:
      return new Error("Supadata API key is invalid (401)");
    case 429:
      // Retryable — BullMQ will retry the indexing job.
      return new Error("Supadata rate/quota limit exceeded (429)");
    default:
      return new Error(
        `Supadata request failed (${status}): ${detail.slice(0, 200)}`,
      );
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
