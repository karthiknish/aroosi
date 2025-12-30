import { z } from "zod";

export const engagementProfilesSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(200),
});

export const engagementQuickPickActionSchema = z.object({
  toUserId: z.string().min(1),
  action: z.enum(["like", "skip"]),
});

export const engagementNoteSchema = z.object({
  toUserId: z.string().min(1),
  note: z.string().max(1000),
});

export const engagementShortlistToggleSchema = z.object({
  toUserId: z.string().min(1, "toUserId is required"),
});
