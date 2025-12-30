import { z } from "zod";

export const stripeCheckoutSchema = z.object({
  planId: z.enum(["premium", "premiumPlus"]).optional(),
  planType: z.enum(["premium", "premiumPlus"]).optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});
