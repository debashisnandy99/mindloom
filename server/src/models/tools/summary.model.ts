import { prisma } from "../../config/prisma.js";
import type { UpsertSummaryBody } from "../../validators/tools.schema.js";

const withPoints = { points: { orderBy: { order: "asc" } } } as const;

export function getSummary(notebookId: string) {
  return prisma.summary.findUnique({ where: { notebookId }, include: withPoints });
}

export function upsertSummary(notebookId: string, input: UpsertSummaryBody) {
  const points = input.points.map((point, index) => ({
    number: point.number,
    heading: point.heading,
    body: point.body,
    order: point.order ?? index,
  }));

  const fields = {
    title: input.title,
    intro: input.intro,
    readMinutes: input.readMinutes,
    sourceCount: input.sourceCount,
  };

  return prisma.summary.upsert({
    where: { notebookId },
    create: { notebookId, ...fields, points: { create: points } },
    update: { ...fields, points: { deleteMany: {}, create: points } },
    include: withPoints,
  });
}

export function deleteSummary(notebookId: string) {
  return prisma.summary.delete({ where: { notebookId } });
}

export function addSummaryPoint(
  summaryId: string,
  point: UpsertSummaryBody["points"][number],
  order: number,
) {
  return prisma.summaryPoint.create({
    data: {
      summaryId,
      number: point.number,
      heading: point.heading,
      body: point.body,
      order: point.order ?? order,
    },
  });
}

export function updateSummaryPoint(
  pointId: string,
  data: Partial<UpsertSummaryBody["points"][number]>,
) {
  return prisma.summaryPoint.update({ where: { id: pointId }, data });
}

export function deleteSummaryPoint(pointId: string) {
  return prisma.summaryPoint.delete({ where: { id: pointId } });
}

export function findSummaryPoint(pointId: string) {
  return prisma.summaryPoint.findUnique({
    where: { id: pointId },
    include: { summary: { select: { notebookId: true } } },
  });
}

export function countSummaryPoints(summaryId: string) {
  return prisma.summaryPoint.count({ where: { summaryId } });
}
