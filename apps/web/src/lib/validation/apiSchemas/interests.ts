import { z } from "zod";

export const interestSendSchema = z.object({
  action: z.literal("send"),
  toUserId: z.string().min(1),
});

export const interestRespondSchema = z.object({
  action: z.literal("respond"),
  interestId: z.string().min(1),
  status: z.enum(["accepted", "rejected"]),
});

export const interestRemoveSchema = z.object({
  action: z.literal("remove"),
  toUserId: z.string().min(1),
});

export const interestsPostSchema = z.discriminatedUnion("action", [
  interestSendSchema,
  interestRespondSchema,
  interestRemoveSchema,
]);

// Legacy endpoint /api/interests/respond accepts { interestId, status }
export const interestsRespondOnlySchema = z.object({
  interestId: z.string().min(1, "interestId is required"),
  status: z.enum(["accepted", "rejected"]),
});
