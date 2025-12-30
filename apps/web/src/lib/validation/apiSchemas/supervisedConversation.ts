import { z } from "zod";

export const supervisedConversationInitiateSchema = z.object({
  targetUserId: z.string().min(1),
  supervisorId: z.string().min(1),
  guidelines: z.array(z.string()).optional(),
});

export const supervisedConversationUpdateSchema = z.object({
  status: z.enum(["approved", "active", "paused", "ended", "rejected"]).optional(),
  conversationId: z.string().optional(),
});
