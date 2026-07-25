import { Router } from "express";
import { passport } from "../config/passport.js";
import {
  getCsrfToken,
  getCurrentUser,
  logout,
  oauthSuccessRedirect,
} from "../controllers/auth.controller.js";
import { env } from "../env.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

const failureRedirect = `${env.CLIENT_URL}/auth?error=oauth_failed`;

router.get(
  "/google",
  authLimiter,
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }),
);

router.get(
  "/google/callback",
  authLimiter,
  passport.authenticate("google", { failureRedirect, session: true }),
  oauthSuccessRedirect,
);

router.get("/github", authLimiter, passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/github/callback",
  authLimiter,
  passport.authenticate("github", { failureRedirect, session: true }),
  oauthSuccessRedirect,
);

router.get("/me", requireAuth, getCurrentUser);
router.get("/csrf", getCsrfToken);
router.post("/logout", requireAuth, logout);

export default router;
