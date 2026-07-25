import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { isProduction } from "../env.js";
import { ApiError, type FieldIssue } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

interface ErrorBody {
  success: false;
  message: string;
  errors?: FieldIssue[];
  stack?: string;
}

function normalise(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.badRequest(
      "Request validation failed",
      err.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
    );
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return ApiError.payloadTooLarge("File is too large");
    return ApiError.badRequest(err.message);
  }

  if (typeof err === "object" && err !== null && "code" in err) {
    // Prisma known request errors.
    const code = (err as { code: string }).code;
    if (code === "P2002") return ApiError.conflict("A record with that value already exists");
    if (code === "P2025") return ApiError.notFound();
    if (code === "P2003") return ApiError.badRequest("Related record does not exist");
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const wrapped = ApiError.internal(isProduction ? "Internal server error" : message);
  if (err instanceof Error) wrapped.stack = err.stack;
  return wrapped;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) return next(err);

  const apiError = normalise(err);

  const log = { err, url: req.originalUrl, method: req.method, userId: req.user?.id };
  if (apiError.statusCode >= 500) logger.error(log, apiError.message);
  else logger.warn(log, apiError.message);

  const body: ErrorBody = { success: false, message: apiError.message };
  if (apiError.issues?.length) body.errors = apiError.issues;
  if (!isProduction && apiError.statusCode >= 500) body.stack = apiError.stack;

  res.status(apiError.statusCode).json(body);
}
