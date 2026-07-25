import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "./asyncHandler.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.isAuthenticated?.() && req.user) return next();
  next(ApiError.unauthorized());
}

/**
 * Resolves `:notebookId` and asserts the session user owns it, so every
 * downstream handler can trust `req.notebook` without re-checking.
 */
export const loadNotebook = asyncHandler(async (req, _res, next) => {
  const notebookId = req.params.notebookId ?? req.params.id;
  if (!notebookId) throw ApiError.badRequest("Notebook id is required");

  const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!notebook) throw ApiError.notFound("Notebook not found");
  if (notebook.ownerId !== req.user!.id) throw ApiError.forbidden();

  req.notebook = notebook;
  next();
});

/** Same guard for routes keyed by `:sourceId` rather than a notebook id. */
export const loadSourceNotebook = asyncHandler(async (req, _res, next) => {
  const { sourceId } = req.params;
  if (!sourceId) throw ApiError.badRequest("Source id is required");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { notebook: true },
  });
  if (!source) throw ApiError.notFound("Source not found");
  if (source.notebook.ownerId !== req.user!.id) throw ApiError.forbidden();

  req.notebook = source.notebook;
  next();
});
