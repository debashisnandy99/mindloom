import { prisma } from "../../config/prisma.js";
import type { UpsertTimelineBody } from "../../validators/tools.schema.js";

const withEvents = { events: { orderBy: { order: "asc" } } } as const;

export function getTimeline(notebookId: string) {
  return prisma.timeline.findUnique({ where: { notebookId }, include: withEvents });
}

export function upsertTimeline(notebookId: string, input: UpsertTimelineBody) {
  const events = input.events.map((event, index) => ({
    year: event.year,
    title: event.title,
    description: event.description,
    order: event.order ?? index,
  }));

  return prisma.timeline.upsert({
    where: { notebookId },
    create: { notebookId, title: input.title, events: { create: events } },
    update: { title: input.title, events: { deleteMany: {}, create: events } },
    include: withEvents,
  });
}

export function deleteTimeline(notebookId: string) {
  return prisma.timeline.delete({ where: { notebookId } });
}

export function addTimelineEvent(
  timelineId: string,
  event: UpsertTimelineBody["events"][number],
  order: number,
) {
  return prisma.timelineEvent.create({
    data: {
      timelineId,
      year: event.year,
      title: event.title,
      description: event.description,
      order: event.order ?? order,
    },
  });
}

export function updateTimelineEvent(
  eventId: string,
  data: Partial<UpsertTimelineBody["events"][number]>,
) {
  return prisma.timelineEvent.update({ where: { id: eventId }, data });
}

export function deleteTimelineEvent(eventId: string) {
  return prisma.timelineEvent.delete({ where: { id: eventId } });
}

export function findTimelineEvent(eventId: string) {
  return prisma.timelineEvent.findUnique({
    where: { id: eventId },
    include: { timeline: { select: { notebookId: true } } },
  });
}

export function countTimelineEvents(timelineId: string) {
  return prisma.timelineEvent.count({ where: { timelineId } });
}
