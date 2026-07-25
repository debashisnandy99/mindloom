import { Router } from "express";
import {
  audioOverviewController,
  conceptTableController,
  flashcardController,
  mindMapController,
  quizController,
  summaryController,
  timelineController,
} from "../../controllers/tools/index.js";
import {
  conceptRowSchema,
  flashcardSchema,
  mindMapNodeSchema,
  quizQuestionSchema,
  summaryPointSchema,
  timelineEventSchema,
  updateConceptRowSchema,
  updateFlashcardSchema,
  updateMindMapNodeSchema,
  updateQuizQuestionSchema,
  updateSummaryPointSchema,
  updateTimelineEventSchema,
  upsertAudioOverviewSchema,
  upsertConceptTableSchema,
  upsertFlashcardDeckSchema,
  upsertMindMapSchema,
  upsertQuizSchema,
  upsertSummarySchema,
  upsertTimelineSchema,
} from "../../validators/tools.schema.js";
import { createToolRouter } from "./toolRouter.factory.js";

const router = Router({ mergeParams: true });

router.use(
  "/mindmap",
  createToolRouter({
    handlers: mindMapController,
    upsertSchema: upsertMindMapSchema,
    items: {
      path: "nodes",
      param: "nodeId",
      createSchema: mindMapNodeSchema,
      updateSchema: updateMindMapNodeSchema,
    },
  }),
);

router.use(
  "/quiz",
  createToolRouter({
    handlers: quizController,
    upsertSchema: upsertQuizSchema,
    items: {
      path: "questions",
      param: "questionId",
      createSchema: quizQuestionSchema,
      updateSchema: updateQuizQuestionSchema,
    },
  }),
);

router.use(
  "/concept-table",
  createToolRouter({
    handlers: conceptTableController,
    upsertSchema: upsertConceptTableSchema,
    items: {
      path: "rows",
      param: "rowId",
      createSchema: conceptRowSchema,
      updateSchema: updateConceptRowSchema,
    },
  }),
);

router.use(
  "/flashcards",
  createToolRouter({
    handlers: flashcardController,
    upsertSchema: upsertFlashcardDeckSchema,
    items: {
      path: "cards",
      param: "cardId",
      createSchema: flashcardSchema,
      updateSchema: updateFlashcardSchema,
    },
  }),
);

router.use(
  "/summary",
  createToolRouter({
    handlers: summaryController,
    upsertSchema: upsertSummarySchema,
    items: {
      path: "points",
      param: "pointId",
      createSchema: summaryPointSchema,
      updateSchema: updateSummaryPointSchema,
    },
  }),
);

router.use(
  "/audio-overview",
  createToolRouter({
    handlers: audioOverviewController,
    upsertSchema: upsertAudioOverviewSchema,
  }),
);

router.use(
  "/timeline",
  createToolRouter({
    handlers: timelineController,
    upsertSchema: upsertTimelineSchema,
    items: {
      path: "events",
      param: "eventId",
      createSchema: timelineEventSchema,
      updateSchema: updateTimelineEventSchema,
    },
  }),
);

export default router;
