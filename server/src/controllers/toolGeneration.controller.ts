import { asyncHandler } from "../middlewares/asyncHandler.js";
import { listToolGenerations } from "../models/toolGeneration.model.js";
import { regenerateNotebookTools } from "../services/generation/regenerate.js";
import { sendAccepted, sendSuccess } from "../utils/ApiResponse.js";

/** Current generation status for every tool in the notebook. */
export const status = asyncHandler(async (req, res) => {
  const generations = await listToolGenerations(req.notebook!.id);
  sendSuccess(res, { generations });
});

/**
 * Manually (re)generate every study tool. Normally regeneration is triggered
 * automatically when sources change; this lets the client offer an explicit
 * "regenerate" action and seed tools for a notebook whose sources were indexed
 * before generation existed.
 */
export const regenerate = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  await regenerateNotebookTools(notebookId, req.user!.id);
  sendAccepted(res, { notebookId }, "Tool generation queued");
});
