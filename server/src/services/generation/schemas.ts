import { z } from "zod";

/**
 * Output schemas for `generateObject`. These describe the shape the LLM must
 * return for each tool. They are looser than the DB upsert schemas (no strict
 * caps that would make the model retry needlessly); the worker maps the result
 * onto the existing `upsert*` model calls afterwards.
 */

export const mindMapGenSchema = z.object({
  title: z.string().describe("Short title for the mind map, 2-4 words."),
  nodes: z
    .array(
      z.object({
        label: z.string().describe("Concept name, 1-4 words."),
        isMain: z.boolean().describe("True for exactly one central node."),
      }),
    )
    .min(4)
    .max(10)
    .describe("One central node plus 3-9 related concept nodes."),
});
export type MindMapGen = z.infer<typeof mindMapGenSchema>;

export const quizGenSchema = z.object({
  title: z.string(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(3).max(5),
        correctIndex: z.number().int().min(0).describe("Index into options."),
        sourceLabel: z.string().describe("Name of the source this tests."),
      }),
    )
    .min(3)
    .max(8),
});
export type QuizGen = z.infer<typeof quizGenSchema>;

export const conceptTableGenSchema = z.object({
  title: z.string(),
  rows: z
    .array(
      z.object({
        concept: z.string(),
        bestSource: z.string(),
        mentions: z.number().int().min(0),
        confidence: z.number().int().min(0).max(100),
      }),
    )
    .min(3)
    .max(12),
});
export type ConceptTableGen = z.infer<typeof conceptTableGenSchema>;

export const flashcardsGenSchema = z.object({
  title: z.string(),
  cards: z
    .array(z.object({ front: z.string(), back: z.string() }))
    .min(4)
    .max(15),
});
export type FlashcardsGen = z.infer<typeof flashcardsGenSchema>;

export const summaryGenSchema = z.object({
  title: z.string(),
  intro: z.string().describe("One-paragraph overview across all sources."),
  readMinutes: z.number().int().min(1).max(60),
  points: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string(),
      }),
    )
    .min(3)
    .max(8),
});
export type SummaryGen = z.infer<typeof summaryGenSchema>;

export const timelineGenSchema = z.object({
  title: z.string(),
  events: z
    .array(
      z.object({
        year: z.string().describe("Year or period label, e.g. '1986' or 'Step 1'."),
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(3)
    .max(12)
    .describe("Chronological or sequential events found in the sources."),
});
export type TimelineGen = z.infer<typeof timelineGenSchema>;
