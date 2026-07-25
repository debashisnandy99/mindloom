import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request } from "express";
import { isProduction } from "../env.js";

/**
 * Authenticated users get their own bucket so shared NATs are not penalised.
 * Anonymous callers fall back to `ipKeyGenerator`, which normalises IPv6 to a
 * /64 subnet so a single client cannot rotate addresses to evade the limit.
 */
function keyGenerator(req: Request): string {
  return req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown");
}

function build(overrides: Partial<Options>) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    // Local development would otherwise trip limits during manual testing.
    skip: () => !isProduction,
    message: { success: false, message: "Too many requests, please try again later" },
    ...overrides,
  });
}

export const apiLimiter = build({ limit: 600 });

export const authLimiter = build({ windowMs: 10 * 60 * 1000, limit: 30 });

/** Uploads trigger S3 writes and embedding spend, so they are tighter. */
export const uploadLimiter = build({ windowMs: 60 * 60 * 1000, limit: 60 });

export const queryLimiter = build({ windowMs: 60 * 1000, limit: 30 });
