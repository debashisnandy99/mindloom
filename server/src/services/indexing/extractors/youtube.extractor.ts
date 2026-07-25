import { YoutubeTranscript, type TranscriptResponse } from "youtube-transcript";
import type { ExtractedDocument, ExtractedSegment } from "../../../types/indexing.js";

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

function toSeconds(cue: TranscriptResponse): number {
  // Offsets are reported in milliseconds by the InnerTube API.
  return cue.offset > 10_000 ? cue.offset / 1000 : cue.offset;
}

export async function extractYoutube(url: string): Promise<ExtractedDocument> {
  const videoId = parseYoutubeId(url);
  if (!videoId) throw new Error(`Could not parse a YouTube video id from "${url}"`);

  const cues = await YoutubeTranscript.fetchTranscript(videoId);
  if (cues.length === 0) throw new Error("This video has no transcript available");

  const segments: ExtractedSegment[] = [];
  let windowStart = toSeconds(cues[0]);
  let buffer: string[] = [];

  const flush = (endSeconds: number) => {
    if (buffer.length === 0) return;
    segments.push({
      text: `[${formatTimestamp(windowStart)}] ${buffer.join(" ")}`,
      metadata: { startSeconds: Math.floor(windowStart), timestamp: formatTimestamp(windowStart) },
    });
    buffer = [];
    windowStart = endSeconds;
  };

  for (const cue of cues) {
    const at = toSeconds(cue);
    if (at - windowStart >= WINDOW_SECONDS) flush(at);
    buffer.push(cue.text.replace(/\s+/g, " ").trim());
  }
  flush(0);

  const last = cues[cues.length - 1];
  const durationSeconds = Math.round(toSeconds(last) + (last.duration > 1000 ? last.duration / 1000 : last.duration));

  return {
    segments,
    metadata: { videoId, url, durationSeconds },
    meta: `YouTube · ${formatTimestamp(durationSeconds)}`,
  };
}
