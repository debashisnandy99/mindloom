import { prisma } from "../../config/prisma.js";
import type { UpsertQuizBody } from "../../validators/tools.schema.js";

const withQuestions = { questions: { orderBy: { order: "asc" } } } as const;

export function getQuiz(notebookId: string) {
  return prisma.quiz.findUnique({ where: { notebookId }, include: withQuestions });
}

export function upsertQuiz(notebookId: string, input: UpsertQuizBody) {
  const questions = input.questions.map((q, index) => ({
    question: q.question,
    sourceLabel: q.sourceLabel,
    correctIndex: q.correctIndex,
    options: q.options,
    order: q.order ?? index,
  }));

  return prisma.quiz.upsert({
    where: { notebookId },
    create: { notebookId, title: input.title, questions: { create: questions } },
    update: { title: input.title, questions: { deleteMany: {}, create: questions } },
    include: withQuestions,
  });
}

export function deleteQuiz(notebookId: string) {
  return prisma.quiz.delete({ where: { notebookId } });
}

export function addQuizQuestion(
  quizId: string,
  question: UpsertQuizBody["questions"][number],
  order: number,
) {
  return prisma.quizQuestion.create({
    data: {
      quizId,
      question: question.question,
      sourceLabel: question.sourceLabel,
      correctIndex: question.correctIndex,
      options: question.options,
      order: question.order ?? order,
    },
  });
}

export function updateQuizQuestion(
  questionId: string,
  data: Partial<UpsertQuizBody["questions"][number]>,
) {
  return prisma.quizQuestion.update({ where: { id: questionId }, data });
}

export function deleteQuizQuestion(questionId: string) {
  return prisma.quizQuestion.delete({ where: { id: questionId } });
}

export function findQuizQuestion(questionId: string) {
  return prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: { select: { notebookId: true } } },
  });
}

export function countQuizQuestions(quizId: string) {
  return prisma.quizQuestion.count({ where: { quizId } });
}
