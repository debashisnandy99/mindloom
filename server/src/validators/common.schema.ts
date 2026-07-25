import { z } from "zod";

/** Trimmed, non-empty string with an upper bound. */
export const nonEmptyString = (max = 500) => z.string().trim().min(1).max(max);
