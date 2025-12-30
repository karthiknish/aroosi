import { z } from "zod";

export const adminProfileUpdateSchema = z
  .object({
    fullName: z.string().trim().max(200).optional(),
    aboutMe: z.string().trim().max(5000).optional(),
    motherTongue: z.string().trim().max(100).optional(),
    religion: z.string().trim().max(100).optional(),
    ethnicity: z.string().trim().max(100).optional(),
    hideFromFreeUsers: z.boolean().optional(),
    subscriptionPlan: z.enum(["free", "premium", "premiumPlus"]).optional(),
    subscriptionExpiresAt: z.number().int().positive().optional(),
  })
  .strict();
