import { z } from "zod";
import { nonEmptyString } from "./common.schema.js";

const order = z.number().int().min(0).optional();

// ── Mind map ──────────────────────────────────────────────────────────────

export const mindMapNodeSchema = z.object({
  label: nonEmptyString(200),
  isMain: z.boolean().default(false),
  // Percentages of the canvas, matching the drag bounds in the client.
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  order,
});

export const upsertMindMapSchema = z.object({
  title: nonEmptyString(200).default("Mind map"),
  generatedMs: z.number().int().min(0).default(0),
  nodes: z.array(mindMapNodeSchema).max(200).default([]),
});

export const updateMindMapNodeSchema = mindMapNodeSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

// ── Quiz ──────────────────────────────────────────────────────────────────

export const quizQuestionSchema = z
  .object({
    question: nonEmptyString(1000),
    sourceLabel: z.string().trim().max(300).default(""),
    correctIndex: z.number().int().min(0),
    options: z.array(nonEmptyString(500)).min(2).max(8),
    order,
  })
  .refine((data) => data.correctIndex < data.options.length, {
    message: "correctIndex must point at one of the options",
    path: ["correctIndex"],
  });

export const upsertQuizSchema = z.object({
  title: nonEmptyString(200).default("Quiz"),
  questions: z.array(quizQuestionSchema).max(100).default([]),
});

export const updateQuizQuestionSchema = z
  .object({
    question: nonEmptyString(1000).optional(),
    sourceLabel: z.string().trim().max(300).optional(),
    correctIndex: z.number().int().min(0).optional(),
    options: z.array(nonEmptyString(500)).min(2).max(8).optional(),
    order,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

// ── Concept table ─────────────────────────────────────────────────────────

export const conceptRowSchema = z.object({
  concept: nonEmptyString(300),
  bestSource: z.string().trim().max(300).default(""),
  mentions: z.number().int().min(0).default(0),
  confidence: z.number().int().min(0).max(100).default(0),
  order,
});

export const upsertConceptTableSchema = z.object({
  title: nonEmptyString(200).default("Concept table"),
  rows: z.array(conceptRowSchema).max(500).default([]),
});

export const updateConceptRowSchema = conceptRowSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

// ── Flashcards ────────────────────────────────────────────────────────────

export const flashcardSchema = z.object({
  front: nonEmptyString(1000),
  back: nonEmptyString(2000),
  order,
});

export const upsertFlashcardDeckSchema = z.object({
  title: nonEmptyString(200).default("Flashcards"),
  cards: z.array(flashcardSchema).max(500).default([]),
});

export const updateFlashcardSchema = flashcardSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

// ── Summary ───────────────────────────────────────────────────────────────

export const summaryPointSchema = z.object({
  number: z.string().trim().min(1).max(8),
  heading: nonEmptyString(300),
  body: nonEmptyString(2000),
  order,
});

export const upsertSummarySchema = z.object({
  title: nonEmptyString(200).default("Study brief"),
  intro: z.string().trim().max(5000).default(""),
  readMinutes: z.number().int().min(0).max(600).default(0),
  sourceCount: z.number().int().min(0).default(0),
  points: z.array(summaryPointSchema).max(100).default([]),
});

export const updateSummaryPointSchema = summaryPointSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

// ── Audio overview ────────────────────────────────────────────────────────

export const upsertAudioOverviewSchema = z.object({
  tag: z.string().trim().max(120).default("DEEP DIVE · TWO HOSTS"),
  title: nonEmptyString(300),
  subtitle: z.string().trim().max(500).default(""),
  durationSeconds: z.number().int().min(0).default(0),
  audioUrl: z.url().nullable().optional(),
  s3Key: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]).default("PENDING"),
});

// ── Timeline ──────────────────────────────────────────────────────────────

export const timelineEventSchema = z.object({
  year: z.string().trim().min(1).max(40),
  title: nonEmptyString(300),
  description: z.string().trim().max(2000).default(""),
  order,
});

export const upsertTimelineSchema = z.object({
  title: nonEmptyString(200).default("Timeline"),
  events: z.array(timelineEventSchema).max(200).default([]),
});

export const updateTimelineEventSchema = timelineEventSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

export type UpsertMindMapBody = z.infer<typeof upsertMindMapSchema>;
export type UpsertQuizBody = z.infer<typeof upsertQuizSchema>;
export type UpsertConceptTableBody = z.infer<typeof upsertConceptTableSchema>;
export type UpsertFlashcardDeckBody = z.infer<typeof upsertFlashcardDeckSchema>;
export type UpsertSummaryBody = z.infer<typeof upsertSummarySchema>;
export type UpsertAudioOverviewBody = z.infer<typeof upsertAudioOverviewSchema>;
export type UpsertTimelineBody = z.infer<typeof upsertTimelineSchema>;
