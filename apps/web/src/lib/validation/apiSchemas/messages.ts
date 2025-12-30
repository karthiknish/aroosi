import { z } from "zod";

export const messageSendSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  fromUserId: z.string().min(1, "fromUserId is required"),
  toUserId: z.string().min(1, "toUserId is required"),
  text: z.string().optional(),
  type: z.enum(["text", "voice", "image", "icebreaker"]).optional(),
  audioStorageId: z.string().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export const messageMarkReadSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
});

export const messagePatchSchema = z.object({
  text: z.string().min(1, "text is required"),
});
