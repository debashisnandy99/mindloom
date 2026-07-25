import * as audioOverviewModel from "../../models/tools/audioOverview.model.js";
import * as conceptTableModel from "../../models/tools/conceptTable.model.js";
import * as flashcardModel from "../../models/tools/flashcard.model.js";
import * as mindMapModel from "../../models/tools/mindmap.model.js";
import * as quizModel from "../../models/tools/quiz.model.js";
import * as summaryModel from "../../models/tools/summary.model.js";
import * as timelineModel from "../../models/tools/timeline.model.js";
import { createToolHandlers } from "./toolController.factory.js";

export const mindMapController = createToolHandlers({
  key: "mindMap",
  itemParam: "nodeId",
  itemKey: "node",
  get: mindMapModel.getMindMap,
  upsert: mindMapModel.upsertMindMap,
  remove: mindMapModel.deleteMindMap,
  addItem: mindMapModel.addMindMapNode,
  updateItem: mindMapModel.updateMindMapNode,
  removeItem: mindMapModel.deleteMindMapNode,
  findItem: async (id) => {
    const node = await mindMapModel.findMindMapNode(id);
    return node ? { notebookId: node.mindMap.notebookId } : null;
  },
  countItems: mindMapModel.countMindMapNodes,
});

export const quizController = createToolHandlers({
  key: "quiz",
  itemParam: "questionId",
  itemKey: "question",
  get: quizModel.getQuiz,
  upsert: quizModel.upsertQuiz,
  remove: quizModel.deleteQuiz,
  addItem: quizModel.addQuizQuestion,
  updateItem: quizModel.updateQuizQuestion,
  removeItem: quizModel.deleteQuizQuestion,
  findItem: async (id) => {
    const question = await quizModel.findQuizQuestion(id);
    return question ? { notebookId: question.quiz.notebookId } : null;
  },
  countItems: quizModel.countQuizQuestions,
});

export const conceptTableController = createToolHandlers({
  key: "conceptTable",
  itemParam: "rowId",
  itemKey: "row",
  get: conceptTableModel.getConceptTable,
  upsert: conceptTableModel.upsertConceptTable,
  remove: conceptTableModel.deleteConceptTable,
  addItem: conceptTableModel.addConceptRow,
  updateItem: conceptTableModel.updateConceptRow,
  removeItem: conceptTableModel.deleteConceptRow,
  findItem: async (id) => {
    const row = await conceptTableModel.findConceptRow(id);
    return row ? { notebookId: row.conceptTable.notebookId } : null;
  },
  countItems: conceptTableModel.countConceptRows,
});

export const flashcardController = createToolHandlers({
  key: "flashcardDeck",
  itemParam: "cardId",
  itemKey: "card",
  get: flashcardModel.getFlashcardDeck,
  upsert: flashcardModel.upsertFlashcardDeck,
  remove: flashcardModel.deleteFlashcardDeck,
  addItem: flashcardModel.addFlashcard,
  updateItem: flashcardModel.updateFlashcard,
  removeItem: flashcardModel.deleteFlashcard,
  findItem: async (id) => {
    const card = await flashcardModel.findFlashcard(id);
    return card ? { notebookId: card.deck.notebookId } : null;
  },
  countItems: flashcardModel.countFlashcards,
});

export const summaryController = createToolHandlers({
  key: "summary",
  itemParam: "pointId",
  itemKey: "point",
  get: summaryModel.getSummary,
  upsert: summaryModel.upsertSummary,
  remove: summaryModel.deleteSummary,
  addItem: summaryModel.addSummaryPoint,
  updateItem: summaryModel.updateSummaryPoint,
  removeItem: summaryModel.deleteSummaryPoint,
  findItem: async (id) => {
    const point = await summaryModel.findSummaryPoint(id);
    return point ? { notebookId: point.summary.notebookId } : null;
  },
  countItems: summaryModel.countSummaryPoints,
});

export const timelineController = createToolHandlers({
  key: "timeline",
  itemParam: "eventId",
  itemKey: "event",
  get: timelineModel.getTimeline,
  upsert: timelineModel.upsertTimeline,
  remove: timelineModel.deleteTimeline,
  addItem: timelineModel.addTimelineEvent,
  updateItem: timelineModel.updateTimelineEvent,
  removeItem: timelineModel.deleteTimelineEvent,
  findItem: async (id) => {
    const event = await timelineModel.findTimelineEvent(id);
    return event ? { notebookId: event.timeline.notebookId } : null;
  },
  countItems: timelineModel.countTimelineEvents,
});

// The audio overview is a single record with no child collection.
export const audioOverviewController = createToolHandlers({
  key: "audioOverview",
  itemParam: "n/a",
  itemKey: "n/a",
  get: audioOverviewModel.getAudioOverview,
  upsert: audioOverviewModel.upsertAudioOverview,
  remove: audioOverviewModel.deleteAudioOverview,
});
