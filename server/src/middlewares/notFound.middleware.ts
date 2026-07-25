import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
