import { prisma } from "../../config/prisma.js";
import type { UpsertAudioOverviewBody } from "../../validators/tools.schema.js";

export function getAudioOverview(notebookId: string) {
  return prisma.audioOverview.findUnique({ where: { notebookId } });
}

export function upsertAudioOverview(notebookId: string, input: UpsertAudioOverviewBody) {
  const fields = {
    tag: input.tag,
    title: input.title,
    subtitle: input.subtitle,
    durationSeconds: input.durationSeconds,
    audioUrl: input.audioUrl ?? null,
    s3Key: input.s3Key ?? null,
    status: input.status,
  };

  return prisma.audioOverview.upsert({
    where: { notebookId },
    create: { notebookId, ...fields },
    update: fields,
  });
}

export function patchAudioOverview(
  notebookId: string,
  data: Partial<UpsertAudioOverviewBody>,
) {
  return prisma.audioOverview.update({ where: { notebookId }, data });
}

export function deleteAudioOverview(notebookId: string) {
  return prisma.audioOverview.delete({ where: { notebookId } });
}
