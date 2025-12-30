import { z } from "zod";

export const typingIndicatorsSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  action: z.enum(["start", "stop"]),
});
