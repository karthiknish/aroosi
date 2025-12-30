import { z } from "zod";

export const reportReasons = [
  "inappropriate_content",
  "harassment",
  "fake_profile",
  "underage",
  "scam",
  "spam",
  "threatening_behavior",
  "safety_concern",
  "inappropriate_behavior",
  "other",
] as const;

export const blockSchema = z.object({
  blockedUserId: z.string().min(1, "blockedUserId is required"),
});

export const unblockSchema = z.object({
  blockedUserId: z.string().min(1, "blockedUserId is required"),
});

export const reportSchema = z
  .object({
    reportedUserId: z.string().min(1, "reportedUserId is required"),
    reason: z.enum(reportReasons),
    description: z.string().optional(),
  })
  .refine(
    (data) =>
      data.reason !== "other" ||
      (data.description && data.description.trim().length > 0),
    {
      message: "Description is required for 'other' report type",
      path: ["description"],
    }
  );
