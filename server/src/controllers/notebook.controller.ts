import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createNotebook,
  deleteNotebook,
  getNotebook,
  listNotebookS3Keys,
  listNotebooks,
  updateNotebook,
} from "../models/notebook.model.js";
import { tryDeleteNotebookCollection } from "../services/indexing/vectorStore.js";
import { deleteFromS3 } from "../services/storage/s3.service.js";
import { ApiError } from "../utils/ApiError.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import type { CreateNotebookBody, UpdateNotebookBody } from "../validators/notebook.schema.js";

export const index = asyncHandler(async (req, res) => {
  const notebooks = await listNotebooks(req.user!.id);
  sendSuccess(res, { notebooks });
});

export const show = asyncHandler(async (req, res) => {
  const notebook = await getNotebook(req.notebook!.id);
  if (!notebook) throw ApiError.notFound("Notebook not found");
  sendSuccess(res, { notebook });
});

export const create = asyncHandler(async (req, res) => {
  const body = req.body as CreateNotebookBody;
  const notebook = await createNotebook(req.user!.id, body);
  sendCreated(res, { notebook }, "Notebook created");
});

export const update = asyncHandler(async (req, res) => {
  const body = req.body as UpdateNotebookBody;
  const notebook = await updateNotebook(req.notebook!.id, body);
  sendSuccess(res, { notebook }, 200, "Notebook updated");
});

export const destroy = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;

  // Clean external stores first; the cascade delete removes the rows. Both
  // cleanups are best-effort so an outage cannot strand an undeletable notebook.
  const keys = await listNotebookS3Keys(notebookId);
  await Promise.all(keys.map((s) => deleteFromS3(s.s3Key!)));
  await tryDeleteNotebookCollection(notebookId);
  await deleteNotebook(notebookId);

  sendNoContent(res);
});
