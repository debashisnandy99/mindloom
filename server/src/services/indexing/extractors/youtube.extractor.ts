import { YoutubeTranscript, type TranscriptResponse } from "youtube-transcript";
import { env } from "../../../env.js";
import type {
  ExtractedDocument,
  ExtractedSegment,
} from "../../../types/indexing.js";
import { childLogger } from "../../../utils/logger.js";
import {
  fetchSupadataTranscript,
  TranscriptUnavailableError,
  type TranscriptCue,
} from "./supadata.js";

const log = childLogger("youtube");

/** Transcript cues are a few seconds each; group them into readable windows. */
const WINDOW_SECONDS = 120;

export function parseYoutubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  return /^[\w-]{11}$/.test(input.trim()) ? input.trim() : null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * The `youtube-transcript` library reports offsets/durations in either
 * milliseconds (InnerTube/srv3) or seconds (classic XML), so normalize by
 * magnitude. Supadata always reports milliseconds and is normalized separately.
 */
function scraperToCue(cue: TranscriptResponse): TranscriptCue {
  const offsetSeconds = cue.offset > 10_000 ? cue.offset / 1000 : cue.offset;
  const durationSeconds =
    cue.duration > 1000 ? cue.duration / 1000 : cue.duration;
  return { text: cue.text, offsetSeconds, durationSeconds };
}

/**
 * Direct scraping fallback for local/residential IPs when Supadata isn't
 * configured. YouTube blocks this from datacenter IPs, which is exactly why
 * production sets SUPADATA_API_KEY.
 */
async function fetchViaScraper(videoId: string): Promise<TranscriptCue[]> {
  const cues = await YoutubeTranscript.fetchTranscript(videoId);
  if (cues.length === 0) throw new TranscriptUnavailableError();
  return cues.map(scraperToCue);
}

function buildDocument(
  cues: TranscriptCue[],
  videoId: string,
  url: string,
): ExtractedDocument {
  const segments: ExtractedSegment[] = [];
  let windowStart = cues[0].offsetSeconds;
  let buffer: string[] = [];

  const flush = (endSeconds: number) => {
    if (buffer.length === 0) return;
    segments.push({
      text: `[${formatTimestamp(windowStart)}] ${buffer.join(" ")}`,
      metadata: {
        startSeconds: Math.floor(windowStart),
        timestamp: formatTimestamp(windowStart),
      },
    });
    buffer = [];
    windowStart = endSeconds;
  };

  for (const cue of cues) {
    if (cue.offsetSeconds - windowStart >= WINDOW_SECONDS)
      flush(cue.offsetSeconds);
    buffer.push(cue.text.replace(/\s+/g, " ").trim());
  }
  flush(0);

  const last = cues[cues.length - 1];
  const durationSeconds = Math.round(last.offsetSeconds + last.durationSeconds);

  return {
    segments,
    metadata: { videoId, url, durationSeconds },
    meta: `YouTube · ${formatTimestamp(durationSeconds)}`,
  };
}

export async function extractYoutube(url: string): Promise<ExtractedDocument> {
  const videoId = parseYoutubeId(url);
  if (!videoId)
    throw new Error(`Could not parse a YouTube video id from "${url}"`);

  let cues: TranscriptCue[];
  if (env.SUPADATA_API_KEY) {
    cues = await fetchSupadataTranscript(url);
  } else {
    log.warn(
      { videoId },
      "SUPADATA_API_KEY not set; scraping transcript directly (blocked from datacenter IPs)",
    );
    cues = await fetchViaScraper(videoId);
  }

  if (cues.length === 0) throw new TranscriptUnavailableError();

  return buildDocument(cues, videoId, url);
}
