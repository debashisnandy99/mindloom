import { Router } from "express";
import { streamNotebookEvents } from "../controllers/events.controller.js";
import * as notebookController from "../controllers/notebook.controller.js";
import * as queryController from "../controllers/query.controller.js";
import * as suggestionController from "../controllers/suggestion.controller.js";
import * as toolGenerationController from "../controllers/toolGeneration.controller.js";
import { loadNotebook } from "../middlewares/auth.middleware.js";
import { csrfProtection } from "../middlewares/csrf.middleware.js";
import { queryLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createQuerySchema } from "../validators/query.schema.js";
import {
  createNotebookSchema,
  updateNotebookSchema,
} from "../validators/notebook.schema.js";
import { notebookSourceRouter } from "./source.routes.js";
import toolRoutes from "./tools/index.js";

const router = Router();

router.get("/", notebookController.index);
router.post("/", csrfProtection, validate({ body: createNotebookSchema }), notebookController.create);

// Everything below is scoped to a notebook the caller owns.
router.use("/:notebookId", loadNotebook);

router.get("/:notebookId", notebookController.show);
router.patch(
  "/:notebookId",
  csrfProtection,
  validate({ body: updateNotebookSchema }),
  notebookController.update,
);
router.delete("/:notebookId", csrfProtection, notebookController.destroy);

router.get("/:notebookId/events", streamNotebookEvents);

router.use("/:notebookId/sources", notebookSourceRouter);

router.get("/:notebookId/suggestions", queryLimiter, suggestionController.suggest);

router.get("/:notebookId/queries", queryController.listQueries);
router.post(
  "/:notebookId/query",
  queryLimiter,
  csrfProtection,
  validate({ body: createQuerySchema }),
  queryController.ask,
);
router.post(
  "/:notebookId/query/stream",
  queryLimiter,
  csrfProtection,
  validate({ body: createQuerySchema }),
  queryController.askStream,
);
router.post(
  "/:notebookId/search",
  queryLimiter,
  validate({ body: createQuerySchema }),
  queryController.search,
);
router.delete("/:notebookId/queries/:queryId", csrfProtection, queryController.deleteQuery);

router.get("/:notebookId/tools/status", toolGenerationController.status);
router.post("/:notebookId/tools/generate", csrfProtection, toolGenerationController.regenerate);

router.use("/:notebookId", csrfProtection, toolRoutes);

export default router;
