import { z } from "zod";

export const subscriptionRestoreSchema = z.object({
  platform: z.enum(["android", "ios"]),
  purchases: z
    .array(
      z.object({
        productId: z.string(),
        purchaseToken: z.string(),
      })
    )
    .optional(),
  receiptData: z.string().optional(),
});

export const subscriptionPurchaseSchema = z.object({
  productId: z.string().min(1),
  purchaseToken: z.string().min(1),
  platform: z.enum(["android", "ios"]),
  receiptData: z.string().optional(),
});

export const subscriptionValidatePurchaseSchema = z.object({
  platform: z.enum(["android", "ios"]),
  productId: z.string().optional(),
  purchaseToken: z.string().optional(),
  receiptData: z.string().optional(),
});

export const subscriptionTrackUsageSchema = z.object({
  feature: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});
