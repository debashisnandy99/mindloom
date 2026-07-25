import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates and coerces request segments. Parsed output replaces the raw
 * input for `body` and `params`. Parsed `query` goes to `res.locals.query`
 * so the same code keeps working under Express 5, where `req.query` is a
 * read-only getter.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({
          path: [key, ...i.path.map(String)].join("."),
          message: i.message,
        }));
        return next(ApiError.badRequest("Request validation failed", issues));
      }

      if (key === "query") {
        res.locals.query = result.data;
      } else {
        req[key] = result.data as never;
      }
    }
    next();
  };
}
