import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "../../env.js";
import { upsertConceptTable } from "../../models/tools/conceptTable.model.js";
import { upsertFlashcardDeck } from "../../models/tools/flashcard.model.js";
import { upsertMindMap } from "../../models/tools/mindmap.model.js";
import { upsertQuiz } from "../../models/tools/quiz.model.js";
import { upsertSummary } from "../../models/tools/summary.model.js";
import { upsertTimeline } from "../../models/tools/timeline.model.js";
import type { ToolKind } from "../../types/generation.js";
import { childLogger } from "../../utils/logger.js";
import { scrollChunks } from "../indexing/vectorStore.js";
import {
  conceptTableGenSchema,
  flashcardsGenSchema,
  mindMapGenSchema,
  quizGenSchema,
  summaryGenSchema,
  timelineGenSchema,
} from "./schemas.js";

const log = childLogger("tool-gen");

/** Radial layout for mind-map nodes: main in the centre, others on a ring. */
function layoutNodes(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [{ x: 50, y: 50 }];
  const ring = count - 1;
  for (let i = 0; i < ring; i++) {
    const angle = (i / ring) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      x: Math.round(50 + 38 * Math.cos(angle)),
      y: Math.round(50 + 38 * Math.sin(angle)),
    });
  }
  return positions;
}

/** Assembles a context corpus from the notebook's indexed chunks. */
async function buildCorpus(notebookId: string): Promise<string> {
  const chunks = await scrollChunks(notebookId);
  if (chunks.length === 0) return "";

  let out = "";
  for (const chunk of chunks) {
    if (out.length + chunk.text.length > env.TOOL_CONTEXT_BUDGET) break;
    out += `${chunk.text}\n\n`;
  }
  return out.trim();
}

const model = () => openai(env.TOOL_GENERATION_MODEL);

async function generate<T>(
  schema: z.ZodType<T>,
  system: string,
  corpus: string,
): Promise<T> {
  const { object } = await generateObject({
    model: model(),
    schema,
    system,
    prompt: `Here are the user's source materials:\n\n${corpus}\n\nGenerate the requested study artifact strictly from this material. Do not invent facts that are not supported by the sources.`,
    temperature: 0.3,
  });
  return object;
}

const SYSTEM: Record<ToolKind, string> = {
  MINDMAP:
    "You build concept mind maps. Identify the single central theme of the sources and the key related concepts branching from it. Exactly one node must have isMain=true.",
  QUIZ: "You write multiple-choice quizzes that test understanding of the sources. Each question has one correct option. correctIndex must point at the correct option.",
  CONCEPT_TABLE:
    "You extract the most important concepts across the sources. For each, name the source that covers it best, estimate how many times it is mentioned, and a 0-100 confidence that it is central to the material.",
  FLASHCARDS:
    "You create study flashcards. Front is a term or question; back is a concise, accurate definition or answer drawn from the sources.",
  SUMMARY:
    "You write a study brief: a short intro plus several numbered key points that synthesize across all sources.",
  TIMELINE:
    "You extract a timeline of dated events or an ordered sequence of steps described in the sources, in chronological or logical order.",
};

/**
 * Generates one tool artifact from the notebook's indexed content and writes it
 * via the existing upsert model call. `onProgress` is invoked between the two
 * long phases (LLM call, persistence) so the caller can drive a progress bar.
 * Returns false when there is no indexed content to generate from.
 */
export async function generateTool(
  notebookId: string,
  kind: ToolKind,
  onProgress: (progress: number, message: string) => Promise<void>,
): Promise<boolean> {
  await onProgress(15, "Reading your sources");
  const corpus = await buildCorpus(notebookId);
  if (!corpus) {
    log.info({ notebookId, kind }, "no indexed content, skipping generation");
    return false;
  }

  await onProgress(40, "Generating with AI");

  switch (kind) {
    case "MINDMAP": {
      const gen = await generate(mindMapGenSchema, SYSTEM.MINDMAP, corpus);
      const pos = layoutNodes(gen.nodes.length);
      await onProgress(85, "Saving mind map");
      await upsertMindMap(notebookId, {
        title: gen.title,
        generatedMs: 0,
        nodes: gen.nodes.map((n, i) => ({
          label: n.label,
          isMain: n.isMain,
          x: pos[i]?.x ?? 50,
          y: pos[i]?.y ?? 50,
          order: i,
        })),
      });
      return true;
    }
    case "QUIZ": {
      const gen = await generate(quizGenSchema, SYSTEM.QUIZ, corpus);
      await onProgress(85, "Saving quiz");
      await upsertQuiz(notebookId, {
        title: gen.title,
        questions: gen.questions.map((q, i) => ({
          question: q.question,
          options: q.options,
          correctIndex: Math.min(q.correctIndex, q.options.length - 1),
          sourceLabel: q.sourceLabel,
          order: i,
        })),
      });
      return true;
    }
    case "CONCEPT_TABLE": {
      const gen = await generate(conceptTableGenSchema, SYSTEM.CONCEPT_TABLE, corpus);
      await onProgress(85, "Saving concept table");
      await upsertConceptTable(notebookId, {
        title: gen.title,
        rows: gen.rows.map((r, i) => ({ ...r, order: i })),
      });
      return true;
    }
    case "FLASHCARDS": {
      const gen = await generate(flashcardsGenSchema, SYSTEM.FLASHCARDS, corpus);
      await onProgress(85, "Saving flashcards");
      await upsertFlashcardDeck(notebookId, {
        title: gen.title,
        cards: gen.cards.map((c, i) => ({ ...c, order: i })),
      });
      return true;
    }
    case "SUMMARY": {
      const gen = await generate(summaryGenSchema, SYSTEM.SUMMARY, corpus);
      await onProgress(85, "Saving study brief");
      await upsertSummary(notebookId, {
        title: gen.title,
        intro: gen.intro,
        readMinutes: gen.readMinutes,
        sourceCount: 0,
        points: gen.points.map((p, i) => ({
          number: String(i + 1).padStart(2, "0"),
          heading: p.heading,
          body: p.body,
          order: i,
        })),
      });
      return true;
    }
    case "TIMELINE": {
      const gen = await generate(timelineGenSchema, SYSTEM.TIMELINE, corpus);
      await onProgress(85, "Saving timeline");
      await upsertTimeline(notebookId, {
        title: gen.title,
        events: gen.events.map((e, i) => ({ ...e, order: i })),
      });
      return true;
    }
  }
}
