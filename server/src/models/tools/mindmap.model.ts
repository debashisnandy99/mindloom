import { prisma } from "../../config/prisma.js";
import type { UpsertMindMapBody } from "../../validators/tools.schema.js";

const withNodes = { nodes: { orderBy: { order: "asc" } } } as const;

export function getMindMap(notebookId: string) {
  return prisma.mindMap.findUnique({ where: { notebookId }, include: withNodes });
}

/** One mind map per notebook, so create and replace share a single path. */
export function upsertMindMap(notebookId: string, input: UpsertMindMapBody) {
  const nodes = input.nodes.map((node, index) => ({
    label: node.label,
    isMain: node.isMain,
    x: node.x,
    y: node.y,
    order: node.order ?? index,
  }));

  return prisma.mindMap.upsert({
    where: { notebookId },
    create: {
      notebookId,
      title: input.title,
      generatedMs: input.generatedMs,
      nodes: { create: nodes },
    },
    update: {
      title: input.title,
      generatedMs: input.generatedMs,
      nodes: { deleteMany: {}, create: nodes },
    },
    include: withNodes,
  });
}

export function deleteMindMap(notebookId: string) {
  return prisma.mindMap.delete({ where: { notebookId } });
}

export function addMindMapNode(
  mindMapId: string,
  node: UpsertMindMapBody["nodes"][number],
  order: number,
) {
  return prisma.mindMapNode.create({
    data: {
      mindMapId,
      label: node.label,
      isMain: node.isMain,
      x: node.x,
      y: node.y,
      order: node.order ?? order,
    },
  });
}

export function updateMindMapNode(
  nodeId: string,
  data: Partial<UpsertMindMapBody["nodes"][number]>,
) {
  return prisma.mindMapNode.update({ where: { id: nodeId }, data });
}

export function deleteMindMapNode(nodeId: string) {
  return prisma.mindMapNode.delete({ where: { id: nodeId } });
}

export function findMindMapNode(nodeId: string) {
  return prisma.mindMapNode.findUnique({
    where: { id: nodeId },
    include: { mindMap: { select: { notebookId: true } } },
  });
}

export function countMindMapNodes(mindMapId: string) {
  return prisma.mindMapNode.count({ where: { mindMapId } });
}
