import { z } from "zod";

export const adminCreateMatchBodySchema = z
  .object({
    // Canonical keys
    fromProfileId: z.string().min(1).optional(),
    toProfileId: z.string().min(1).optional(),
    // Back-compat with existing admin UI/client wrapper
    user1Id: z.string().min(1).optional(),
    user2Id: z.string().min(1).optional(),
  })
  .superRefine((v, ctx) => {
    const from = v.fromProfileId ?? v.user1Id;
    const to = v.toProfileId ?? v.user2Id;

    if (!from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fromProfileId (or user1Id) is required",
        path: ["fromProfileId"],
      });
    }
    if (!to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "toProfileId (or user2Id) is required",
        path: ["toProfileId"],
      });
    }
    if (from && to && from === to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fromProfileId and toProfileId must differ",
        path: ["toProfileId"],
      });
    }
  });
