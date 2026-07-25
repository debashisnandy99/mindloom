import { doubleCsrf } from "csrf-csrf";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env, isProduction } from "../env.js";

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  getSessionIdentifier: (req: Request) => req.sessionID ?? "",
  cookieName: isProduction ? "__Host-mindloom.csrf" : "mindloom.csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req: Request) => req.headers["x-csrf-token"] as string | undefined,
});

export const issueCsrfToken = generateCsrfToken;

/**
 * Off by default (`ENABLE_CSRF=false`) because the session cookie is already
 * SameSite-scoped; turn it on once the client is served from a real domain.
 */
export const csrfProtection: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!env.ENABLE_CSRF) return next();
  return doubleCsrfProtection(req, res, next);
};
