import { z } from "zod";

export const appealCreateSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
  details: z.string().min(1, "Details are required").max(2000),
});
