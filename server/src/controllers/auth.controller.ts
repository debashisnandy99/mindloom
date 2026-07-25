import type { Request, Response } from "express";
import { env } from "../env.js";
import { issueCsrfToken } from "../middlewares/csrf.middleware.js";
import { listAccountsForUser, } from "../models/account.model.js";
import { toPublicUser } from "../models/user.model.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { logger } from "../utils/logger.js";

export function oauthSuccessRedirect(_req: Request, res: Response) {
  res.redirect(`${env.CLIENT_URL}/notebooks`);
}

export function oauthFailureRedirect(_req: Request, res: Response) {
  res.redirect(`${env.CLIENT_URL}/auth?error=oauth_failed`);
}

export const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();

  const accounts = await listAccountsForUser(req.user.id);
  sendSuccess(res, { user: toPublicUser(req.user), accounts });
});

export function getCsrfToken(req: Request, res: Response) {
  sendSuccess(res, { csrfToken: env.ENABLE_CSRF ? issueCsrfToken(req, res) : null });
}

export function logout(req: Request, res: Response) {
  const done = () => sendSuccess(res, { loggedOut: true }, 200, "Logged out");

  if (!req.session) return done();

  req.logout((logoutErr) => {
    if (logoutErr) logger.warn({ err: logoutErr }, "passport logout failed");

    req.session.destroy((destroyErr) => {
      if (destroyErr) logger.warn({ err: destroyErr }, "session destroy failed");
      res.clearCookie(env.SESSION_NAME, { path: "/" });
      done();
    });
  });
}
