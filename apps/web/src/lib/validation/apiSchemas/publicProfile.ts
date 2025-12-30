import { z } from "zod";

export const publicProfileQuerySchema = z.object({
  userId: z.string().min(1, "userId is required"),
});
