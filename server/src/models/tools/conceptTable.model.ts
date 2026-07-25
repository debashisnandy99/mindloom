import { prisma } from "../../config/prisma.js";
import type { UpsertConceptTableBody } from "../../validators/tools.schema.js";

const withRows = { rows: { orderBy: { order: "asc" } } } as const;

export function getConceptTable(notebookId: string) {
  return prisma.conceptTable.findUnique({ where: { notebookId }, include: withRows });
}

export function upsertConceptTable(notebookId: string, input: UpsertConceptTableBody) {
  const rows = input.rows.map((row, index) => ({
    concept: row.concept,
    bestSource: row.bestSource,
    mentions: row.mentions,
    confidence: row.confidence,
    order: row.order ?? index,
  }));

  return prisma.conceptTable.upsert({
    where: { notebookId },
    create: { notebookId, title: input.title, rows: { create: rows } },
    update: { title: input.title, rows: { deleteMany: {}, create: rows } },
    include: withRows,
  });
}

export function deleteConceptTable(notebookId: string) {
  return prisma.conceptTable.delete({ where: { notebookId } });
}

export function addConceptRow(
  conceptTableId: string,
  row: UpsertConceptTableBody["rows"][number],
  order: number,
) {
  return prisma.conceptRow.create({
    data: {
      conceptTableId,
      concept: row.concept,
      bestSource: row.bestSource,
      mentions: row.mentions,
      confidence: row.confidence,
      order: row.order ?? order,
    },
  });
}

export function updateConceptRow(
  rowId: string,
  data: Partial<UpsertConceptTableBody["rows"][number]>,
) {
  return prisma.conceptRow.update({ where: { id: rowId }, data });
}

export function deleteConceptRow(rowId: string) {
  return prisma.conceptRow.delete({ where: { id: rowId } });
}

export function findConceptRow(rowId: string) {
  return prisma.conceptRow.findUnique({
    where: { id: rowId },
    include: { conceptTable: { select: { notebookId: true } } },
  });
}

export function countConceptRows(conceptTableId: string) {
  return prisma.conceptRow.count({ where: { conceptTableId } });
}
