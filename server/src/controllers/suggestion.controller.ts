import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { prisma } from "../config/prisma.js";
import { env } from "../env.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { scrollChunks } from "../services/indexing/vectorStore.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("suggestions");

/** Suggestions need less context than full tool generation. */
const SUGGESTION_CONTEXT_BUDGET = Math.min(env.TOOL_CONTEXT_BUDGET, 12_000);

const FALLBACK_SUGGESTIONS = [
  "What are the key takeaways?",
  "Summarize the main argument in five bullets",
  "What should I focus on to understand this?",
  "Where do my sources disagree?",
  "Explain the hardest concept simply",
  "Build me a study plan from these sources",
];

const SYSTEM_PROMPT = `You generate short, curiosity-driven questions a student might ask about their study sources.

Rules:
- Return a JSON array of exactly 6 strings.
- Each string is a single question, max 12 words.
- Questions must be diverse: mix "what", "how", "why", comparison, and application styles.
- Ground every question in the provided source excerpts — do not invent topics that are not present.
- Do NOT reference specific source names — keep questions source-agnostic but topically relevant.
- Return ONLY the JSON array, no markdown fences, no explanation.`;

let provider: ReturnType<typeof createXai> | undefined;

function getModel() {
  if (!env.XAI_API_KEY) return null;

  provider ??= createXai({
    apiKey: env.XAI_API_KEY,
    ...(env.XAI_BASE_URL ? { baseURL: env.XAI_BASE_URL } : {}),
  });

  return provider(env.XAI_MODEL);
}

/** In-place Fisher–Yates shuffle; returns the same array for chaining. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pulls indexed chunks from Qdrant and packs them into a prompt-sized corpus.
 * Sampling across sources first keeps one long PDF from crowding out the rest.
 * Source and chunk order are shuffled each call so repeated requests surface
 * different excerpts — and therefore different suggestions.
 */
async function buildCorpusFromQdrant(notebookId: string): Promise<string> {
  const chunks = await scrollChunks(notebookId);
  if (chunks.length === 0) return "";

  // Round-robin by source so each document contributes before any one dominates.
  const bySource = new Map<string, string[]>();
  for (const chunk of chunks) {
    const key = chunk.sourceId || chunk.sourceName || "unknown";
    const list = bySource.get(key) ?? [];
    list.push(chunk.text);
    bySource.set(key, list);
  }

  // Shuffle the per-source queues and their order for variety across calls.
  const queues = shuffle([...bySource.values()].map((q) => shuffle(q)));
  let out = "";
  let progressed = true;

  while (progressed && out.length < SUGGESTION_CONTEXT_BUDGET) {
    progressed = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      if (out.length + next.length > SUGGESTION_CONTEXT_BUDGET) {
        progressed = false;
        break;
      }
      out += `${next}\n\n`;
      progressed = true;
    }
  }

  return out.trim();
}

function buildPrompt(corpus: string, exclude: string[]): string {
  const avoid = exclude.length
    ? `\n\nThe student has already been shown the questions below. Do NOT repeat or paraphrase any of them — produce a fresh, different set:\n${exclude.map((q) => `- ${q}`).join("\n")}`
    : "";
  return `Here are excerpts from the student's indexed notebook sources:\n\n${corpus}\n\nGenerate 6 suggested questions a student might ask to study this material.${avoid}`;
}

/** Previously-shown suggestions the client asks us to avoid, newline-separated. */
function parseExclude(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseSuggestions(text: string): string[] | null {
  try {
    // Strip any accidental markdown fences the model may add.
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed.slice(0, 6);
    }
  } catch {
    /* fall through to null */
  }
  return null;
}

export const suggest = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  const exclude = parseExclude(req.query.exclude);

  // Generic fallbacks (used only once there IS indexed data but generation is
  // unavailable), minus anything the client has already seen.
  const fallback = () => {
    const filtered = FALLBACK_SUGGESTIONS.filter((s) => !exclude.includes(s));
    return filtered.length > 0 ? filtered : FALLBACK_SUGGESTIONS;
  };

  const indexedCount = await prisma.source.count({
    where: { notebookId, status: "INDEXED" },
  });

  // Nothing indexed yet → no suggestions at all. The client hides the bar until
  // indexing completes, so it never shows questions ungrounded in real sources.
  if (indexedCount === 0) {
    return sendSuccess(res, { suggestions: [] });
  }

  const corpus = await buildCorpusFromQdrant(notebookId);

  // Sources marked INDEXED but Qdrant empty (e.g. collection wiped) → fallback.
  if (!corpus) {
    log.warn(
      { notebookId },
      "no Qdrant chunks for notebook — returning fallback suggestions",
    );
    return sendSuccess(res, { suggestions: fallback() });
  }

  const model = getModel();

  // XAI not configured → graceful fallback.
  if (!model) {
    log.warn("XAI_API_KEY not set — returning fallback suggestions");
    return sendSuccess(res, { suggestions: fallback() });
  }

  try {
    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(corpus, exclude),
      temperature: 0.8,
    });

    const suggestions = parseSuggestions(result.text);

    if (suggestions && suggestions.length > 0) {
      log.debug(
        {
          notebookId,
          count: suggestions.length,
          corpusChars: corpus.length,
          excluded: exclude.length,
        },
        "generated suggestions from Qdrant corpus",
      );
      return sendSuccess(res, { suggestions });
    }

    log.warn(
      { notebookId, raw: result.text },
      "failed to parse suggestions — using fallback",
    );
    return sendSuccess(res, { suggestions: fallback() });
  } catch (err) {
    log.error(
      { err, notebookId },
      "suggestion generation failed — using fallback",
    );
    return sendSuccess(res, { suggestions: fallback() });
  }
});
