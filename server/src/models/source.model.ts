import { prisma } from "../config/prisma.js";
import type { SourceStatus, SourceType } from "../generated/prisma/enums.js";

export interface CreateSourceInput {
  notebookId: string;
  name: string;
  type: SourceType;
  content: string;
  meta?: string;
  s3Key?: string;
  mimeType?: string;
  fileSize?: number;
}

export function listSources(notebookId: string) {
  return prisma.source.findMany({
    where: { notebookId },
    orderBy: { createdAt: "asc" },
  });
}

export function getSource(id: string) {
  return prisma.source.findUnique({ where: { id } });
}

export function createSource(input: CreateSourceInput) {
  return prisma.source.create({
    data: {
      notebookId: input.notebookId,
      name: input.name,
      type: input.type,
      content: input.content,
      meta: input.meta ?? "",
      s3Key: input.s3Key,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      status: "PENDING",
    },
  });
}

export function setSourceStatus(id: string, status: SourceStatus, errorMessage?: string | null) {
  return prisma.source.update({
    where: { id },
    data: { status, errorMessage: errorMessage ?? null },
  });
}

export function deleteSource(id: string) {
  return prisma.source.delete({ where: { id } });
}

export function countIndexedSources(notebookId: string) {
  return prisma.source.count({ where: { notebookId, status: "INDEXED" } });
}
