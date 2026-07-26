import { prisma } from "../config/prisma.js";
import type { GenerationStatus, ToolKind } from "../types/generation.js";

/** Read all generation rows for a notebook (used by the SSE snapshot). */
export function listToolGenerations(notebookId: string) {
  return prisma.toolGeneration.findMany({ where: { notebookId } });
}

export function getToolGeneration(notebookId: string, kind: ToolKind) {
  return prisma.toolGeneration.findUnique({
    where: { notebookId_kind: { notebookId, kind } },
  });
}

/**
 * Marks a tool as queued and bumps its revision so any in-flight job for the
 * same tool knows it has been superseded. Returns the new revision to stamp on
 * the enqueued job.
 */
export async function markQueued(notebookId: string, kind: ToolKind): Promise<number> {
  const row = await prisma.toolGeneration.upsert({
    where: { notebookId_kind: { notebookId, kind } },
    create: {
      notebookId,
      kind,
      status: "QUEUED",
      progress: 0,
      message: "Queued for generation",
      revision: 1,
    },
    update: {
      status: "QUEUED",
      progress: 0,
      message: "Queued for generation",
      errorMessage: null,
      revision: { increment: 1 },
    },
  });
  return row.revision;
}

export function updateProgress(
  notebookId: string,
  kind: ToolKind,
  data: {
    status: GenerationStatus;
    progress: number;
    message?: string;
    errorMessage?: string | null;
    generatedMs?: number;
  },
) {
  return prisma.toolGeneration.update({
    where: { notebookId_kind: { notebookId, kind } },
    data: {
      status: data.status,
      progress: data.progress,
      message: data.message,
      errorMessage: data.errorMessage,
      generatedMs: data.generatedMs,
    },
  });
}

/** The current revision, used by a running job to detect it was superseded. */
export async function currentRevision(
  notebookId: string,
  kind: ToolKind,
): Promise<number> {
  const row = await prisma.toolGeneration.findUnique({
    where: { notebookId_kind: { notebookId, kind } },
    select: { revision: true },
  });
  return row?.revision ?? 0;
}

export function deleteToolGeneration(notebookId: string, kind: ToolKind) {
  return prisma.toolGeneration.deleteMany({ where: { notebookId, kind } });
}
