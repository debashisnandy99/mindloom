import { z } from "zod";
import { nonEmptyString } from "./common.schema.js";

export const createNotebookSchema = z.object({
  name: nonEmptyString(200),
  description: z.string().trim().max(2000).default(""),
});

export const updateNotebookSchema = z
  .object({
    name: nonEmptyString(200).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateNotebookBody = z.infer<typeof createNotebookSchema>;
export type UpdateNotebookBody = z.infer<typeof updateNotebookSchema>;
