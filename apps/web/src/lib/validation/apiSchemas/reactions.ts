import { z } from "zod";

export const reactionToggleSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  emoji: z.string().min(1, "emoji is required"),
});
