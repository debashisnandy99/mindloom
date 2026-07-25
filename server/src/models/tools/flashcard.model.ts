import { prisma } from "../../config/prisma.js";
import type { UpsertFlashcardDeckBody } from "../../validators/tools.schema.js";

const withCards = { cards: { orderBy: { order: "asc" } } } as const;

export function getFlashcardDeck(notebookId: string) {
  return prisma.flashcardDeck.findUnique({ where: { notebookId }, include: withCards });
}

export function upsertFlashcardDeck(notebookId: string, input: UpsertFlashcardDeckBody) {
  const cards = input.cards.map((card, index) => ({
    front: card.front,
    back: card.back,
    order: card.order ?? index,
  }));

  return prisma.flashcardDeck.upsert({
    where: { notebookId },
    create: { notebookId, title: input.title, cards: { create: cards } },
    update: { title: input.title, cards: { deleteMany: {}, create: cards } },
    include: withCards,
  });
}

export function deleteFlashcardDeck(notebookId: string) {
  return prisma.flashcardDeck.delete({ where: { notebookId } });
}

export function addFlashcard(
  deckId: string,
  card: UpsertFlashcardDeckBody["cards"][number],
  order: number,
) {
  return prisma.flashcard.create({
    data: { deckId, front: card.front, back: card.back, order: card.order ?? order },
  });
}

export function updateFlashcard(
  cardId: string,
  data: Partial<UpsertFlashcardDeckBody["cards"][number]>,
) {
  return prisma.flashcard.update({ where: { id: cardId }, data });
}

export function deleteFlashcard(cardId: string) {
  return prisma.flashcard.delete({ where: { id: cardId } });
}

export function findFlashcard(cardId: string) {
  return prisma.flashcard.findUnique({
    where: { id: cardId },
    include: { deck: { select: { notebookId: true } } },
  });
}

export function countFlashcards(deckId: string) {
  return prisma.flashcard.count({ where: { deckId } });
}
