import { prisma } from "../../config/prisma.js";
import { deleteConceptTable } from "../../models/tools/conceptTable.model.js";
import { deleteFlashcardDeck } from "../../models/tools/flashcard.model.js";
import { deleteMindMap } from "../../models/tools/mindmap.model.js";
import { deleteQuiz } from "../../models/tools/quiz.model.js";
import { deleteSummary } from "../../models/tools/summary.model.js";
import { deleteTimeline } from "../../models/tools/timeline.model.js";
import { markQueued } from "../../models/toolGeneration.model.js";
import { GENERATED_TOOL_KINDS, type ToolKind } from "../../types/generation.js";
import { childLogger } from "../../utils/logger.js";
import { enqueueToolGeneration } from "./queue.js";

const log = childLogger("regenerate");

/**
 * Queues regeneration of every generated tool for a notebook. Called whenever
 * the notebook's sources change (add, reindex, delete). Each tool is marked
 * QUEUED first — bumping its revision so a superseded in-flight job aborts —
 * then enqueued with that revision stamped on the job.
 */
export async function regenerateNotebookTools(
  notebookId: string,
  userId: string,
): Promise<void> {
  await Promise.all(
    GENERATED_TOOL_KINDS.map(async (kind) => {
      const revision = await markQueued(notebookId, kind);
      await enqueueToolGeneration({ notebookId, kind, userId, revision });
    }),
  );
  log.info({ notebookId, tools: GENERATED_TOOL_KINDS.length }, "queued tool regeneration");
}

/**
 * Recreates jobs for persisted QUEUED states when a worker starts. This also
 * repairs rows left behind by the old fixed-job-id queue implementation.
 */
export async function requeueQueuedToolGenerations(): Promise<number> {
  const queued = await prisma.toolGeneration.findMany({
    where: { status: "QUEUED" },
    include: { notebook: { select: { ownerId: true } } },
  });

  await Promise.all(
    queued.map((generation) =>
      enqueueToolGeneration({
        notebookId: generation.notebookId,
        kind: generation.kind,
        userId: generation.notebook.ownerId,
        revision: generation.revision,
      }),
    ),
  );

  log.info({ tools: queued.length }, "requeued persisted tool generations");
  return queued.length;
}

const CLEARERS: Record<ToolKind, (notebookId: string) => Promise<unknown>> = {
  MINDMAP: (id) => deleteMindMap(id).catch(() => undefined),
  QUIZ: (id) => deleteQuiz(id).catch(() => undefined),
  CONCEPT_TABLE: (id) => deleteConceptTable(id).catch(() => undefined),
  FLASHCARDS: (id) => deleteFlashcardDeck(id).catch(() => undefined),
  SUMMARY: (id) => deleteSummary(id).catch(() => undefined),
  TIMELINE: (id) => deleteTimeline(id).catch(() => undefined),
};

/** Removes a tool artifact, e.g. when the last source is deleted. */
export function clearTool(notebookId: string, kind: ToolKind): Promise<unknown> {
  return CLEARERS[kind](notebookId);
}
