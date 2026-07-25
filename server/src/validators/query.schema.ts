import { z } from "zod";

export const createQuerySchema = z.object({
  query: z.string().trim().min(1, "Query cannot be empty").max(4000),
  sourceIds: z.array(z.uuid()).max(50).optional(),
  topK: z.number().int().min(1).max(50).optional(),
});

export type CreateQueryBody = z.infer<typeof createQuerySchema>;
