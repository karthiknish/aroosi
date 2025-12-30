import { z } from "zod";

const templateKeySchema = z.enum([
  "profileCompletionReminder",
  "premiumPromo",
  "recommendedProfiles",
  "reEngagement",
  "successStory",
  "weeklyDigest",
  "welcomeDay1",
  "builder",
]);

export const adminMarketingEmailBodySchema = z
  .object({
    templateKey: templateKeySchema.optional(),
    params: z
      .object({
        args: z.array(z.any()).optional(),
        schema: z.any().optional(),
      })
      .passthrough()
      .optional(),

    dryRun: z.boolean().optional(),
    exportCsv: z.boolean().optional(),
    confirm: z.boolean().optional(),
    maxAudience: z.number().int().min(1).max(10000).optional(),

    sendToAll: z.boolean().optional(),
    sendToAllFromAuth: z.boolean().optional(),

    subject: z.string().min(1).max(200).optional(),
    body: z.string().optional(),
    preheader: z.string().max(200).optional(),

    abTest: z
      .object({
        subjects: z.tuple([z.string().min(1).max(200), z.string().min(1).max(200)]),
        ratio: z.number().int().min(1).max(99).optional(),
      })
      .optional(),

    search: z.string().max(200).optional(),
    plan: z.string().max(50).optional(),
    banned: z.enum(["true", "false"]).optional(),

    lastActiveDays: z.number().int().min(0).max(3650).optional(),
    lastActiveFrom: z.number().int().min(0).optional(),
    lastActiveTo: z.number().int().min(0).optional(),

    completionMin: z.number().int().min(0).max(100).optional(),
    completionMax: z.number().int().min(0).max(100).optional(),

    city: z.union([z.string().min(1).max(100), z.array(z.string().min(1).max(100)).min(1)]).optional(),
    country: z.union([z.string().min(1).max(100), z.array(z.string().min(1).max(100)).min(1)]).optional(),

    createdAtFrom: z.number().int().min(0).optional(),
    createdAtTo: z.number().int().min(0).optional(),

    page: z.number().int().min(1).max(100000).optional(),
    pageSize: z.number().int().min(1).max(5000).optional(),

    sortBy: z.enum(["createdAt", "updatedAt", "subscriptionPlan"]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),

    priority: z.enum(["high", "normal", "low"]).optional(),
    listId: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const hasTemplate = Boolean(val.templateKey);
    const hasCustom = Boolean(val.subject);

    if (!hasTemplate && !hasCustom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide templateKey or subject/body",
        path: ["templateKey"],
      });
    }

    if (val.subject && !val.body && !hasTemplate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom email requires body",
        path: ["body"],
      });
    }

    if (val.completionMin != null && val.completionMax != null && val.completionMin > val.completionMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completionMin must be <= completionMax",
        path: ["completionMin"],
      });
    }

    if (val.lastActiveFrom != null && val.lastActiveTo != null && val.lastActiveFrom > val.lastActiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lastActiveFrom must be <= lastActiveTo",
        path: ["lastActiveFrom"],
      });
    }

    if (val.createdAtFrom != null && val.createdAtTo != null && val.createdAtFrom > val.createdAtTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "createdAtFrom must be <= createdAtTo",
        path: ["createdAtFrom"],
      });
    }
  });
