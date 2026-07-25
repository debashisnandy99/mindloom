import type { Prisma } from "../../generated/prisma/client.js";

/**
 * Placeholders for producing tool artifacts from a notebook's indexed
 * sources. The CRUD endpoints are fully implemented; only the model-driven
 * generation is deferred, and each function is a drop-in for the matching
 * `create*` model call once wired up.
 */

export async function generateMindMap(
  _notebookId: string,
): Promise<Prisma.MindMapCreateInput | null> {
  // TODO: cluster indexed chunks into concepts and lay out nodes
  return null;
}

export async function generateQuiz(
  _notebookId: string,
): Promise<Prisma.QuizCreateInput | null> {
  // TODO: generate multiple-choice questions with source attributions
  return null;
}

export async function generateConceptTable(
  _notebookId: string,
): Promise<Prisma.ConceptTableCreateInput | null> {
  // TODO: extract concepts, count mentions, score confidence per source
  return null;
}

export async function generateFlashcards(
  _notebookId: string,
): Promise<Prisma.FlashcardDeckCreateInput | null> {
  // TODO: generate term/definition pairs
  return null;
}

export async function generateSummary(
  _notebookId: string,
): Promise<Prisma.SummaryCreateInput | null> {
  // TODO: summarise across sources into intro plus numbered points
  return null;
}

export async function generateAudioOverview(
  _notebookId: string,
): Promise<Prisma.AudioOverviewCreateInput | null> {
  // TODO: script a two-host dialogue, synthesise speech, upload to S3
  return null;
}

export async function generateTimeline(
  _notebookId: string,
): Promise<Prisma.TimelineCreateInput | null> {
  // TODO: extract dated events and order them chronologically
  return null;
}
