import { Router } from "express";
import * as sourceController from "../controllers/source.controller.js";
import { loadNotebook, loadSourceNotebook } from "../middlewares/auth.middleware.js";
import { csrfProtection } from "../middlewares/csrf.middleware.js";
import { uploadLimiter } from "../middlewares/rateLimit.middleware.js";
import { uploadPdf } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createSourceSchema } from "../validators/source.schema.js";

/** Nested under `/notebooks/:notebookId`. */
export const notebookSourceRouter = Router({ mergeParams: true });

notebookSourceRouter.get("/", sourceController.index);

/**
 * PDFs come in as multipart and are handled by multer; every other type is
 * plain JSON and goes through the zod discriminated union. Splitting on the
 * content type keeps one URL for all five source kinds.
 */
notebookSourceRouter.post(
  "/",
  uploadLimiter,
  csrfProtection,
  (req, res, next) => {
    if (req.is("multipart/form-data")) return uploadPdf(req, res, next);
    return validate({ body: createSourceSchema })(req, res, next);
  },
  sourceController.create,
);

/** Top-level `/sources/:sourceId` routes, guarded via the parent notebook. */
export const sourceRouter = Router();

sourceRouter.use("/:sourceId", loadSourceNotebook);
sourceRouter.get("/:sourceId", sourceController.show);
sourceRouter.post("/:sourceId/reindex", uploadLimiter, csrfProtection, sourceController.reindex);
sourceRouter.delete("/:sourceId", csrfProtection, sourceController.destroy);

export { loadNotebook };
