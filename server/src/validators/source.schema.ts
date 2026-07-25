import { z } from "zod";
import { nonEmptyString } from "./common.schema.js";

const httpUrl = z
  .url("Must be a valid http(s) URL")
  .refine((value) => /^https?:\/\//i.test(value), "Only http and https URLs are supported");

/**
 * PDFs arrive as multipart and are validated by multer, so the JSON body
 * schema covers only the link and text source types.
 */
export const createSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("URL"),
    name: nonEmptyString(300).optional(),
    content: httpUrl,
  }),
  z.object({
    type: z.literal("YT"),
    name: nonEmptyString(300).optional(),
    content: httpUrl.refine(
      (value) => /youtube\.com|youtu\.be/i.test(value),
      "Must be a YouTube URL",
    ),
  }),
  z.object({
    type: z.literal("GDOC"),
    name: nonEmptyString(300).optional(),
    content: httpUrl.refine(
      (value) => /docs\.google\.com/i.test(value),
      "Must be a Google Docs URL",
    ),
  }),
  z.object({
    type: z.literal("TEXT"),
    name: nonEmptyString(300).optional(),
    content: z.string().trim().min(1, "Text cannot be empty").max(500_000),
  }),
]);

export type CreateSourceBody = z.infer<typeof createSourceSchema>;
