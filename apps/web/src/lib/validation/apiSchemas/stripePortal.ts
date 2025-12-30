import { z } from "zod";

export const stripePortalSchema = z
  .object({
    returnUrl: z.string().optional(),
  })
  .optional();
