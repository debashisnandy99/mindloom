import { prisma } from "../config/prisma.js";

export interface NotebookInput {
  name: string;
  description?: string;
}

export function listNotebooks(ownerId: string) {
  return prisma.notebook.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { sources: true } } },
  });
}

export function getNotebook(id: string) {
  return prisma.notebook.findUnique({
    where: { id },
    include: {
      _count: { select: { sources: true, queries: true } },
      sources: { orderBy: { createdAt: "asc" } },
    },
  });
}

export function createNotebook(ownerId: string, input: NotebookInput) {
  return prisma.notebook.create({
    data: { ownerId, name: input.name, description: input.description ?? "" },
    include: { _count: { select: { sources: true } } },
  });
}

export function updateNotebook(id: string, input: Partial<NotebookInput>) {
  return prisma.notebook.update({
    where: { id },
    data: { name: input.name, description: input.description },
    include: { _count: { select: { sources: true } } },
  });
}

export function deleteNotebook(id: string) {
  return prisma.notebook.delete({ where: { id } });
}

export function listNotebookS3Keys(notebookId: string) {
  return prisma.source.findMany({
    where: { notebookId, s3Key: { not: null } },
    select: { s3Key: true },
  });
}
