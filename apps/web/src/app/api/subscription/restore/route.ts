import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { getAndroidPublisherAccessToken } from "@/lib/googlePlay";
import { subscriptionRestoreSchema } from "@/lib/validation/apiSchemas/subscription";
import {
  IAP_PRODUCT_IDS,
  resolvePlanFromProductId,
  type AppPlanId,
} from "@/lib/subscription/catalog";

async function validateAppleReceipt(receiptData: string): Promise<{
  valid: boolean;
  subscriptions?: Array<{
    productId: string;
    expiresAt: number;
    transactionId: string;
    originalTransactionId: string;
  }>;
  error?: string;
}> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    return { valid: false, error: "Apple shared secret not configured" };
  }

  const requestBody = {
    "receipt-data": receiptData,
    password: sharedSecret,
    "exclude-old-transactions": true,
  };

  let response = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  let result = await response.json();

  if (result.status === 21007) {
    response = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    result = await response.json();
  }

  if (result.status !== 0) {
    return { valid: false, error: `Apple validation failed with status ${result.status}` };
  }

  const subscriptions = [];
  const inAppPurchases = result.receipt?.in_app || [];

  const known = new Set(
    [
      ...IAP_PRODUCT_IDS.ios.premium.monthly,
      ...IAP_PRODUCT_IDS.ios.premium.yearly,
      ...IAP_PRODUCT_IDS.ios.premiumPlus.monthly,
      ...IAP_PRODUCT_IDS.ios.premiumPlus.yearly,
    ].filter(Boolean)
  );

  for (const purchase of inAppPurchases) {
    if (purchase.product_id && known.has(purchase.product_id)) {
      const expiresAt = parseInt(purchase.expires_date_ms);
      if (expiresAt > Date.now()) {
        subscriptions.push({
          productId: purchase.product_id,
          expiresAt,
          transactionId: purchase.transaction_id,
          originalTransactionId: purchase.original_transaction_id,
        });
      }
    }
  }

  return { valid: subscriptions.length > 0, subscriptions };
}

async function validateGooglePurchase(
  productId: string,
  purchaseToken: string
): Promise<{ valid: boolean; expiresAt?: number; error?: string }> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    return { valid: false, error: "Google Play package name not configured" };
  }
  const accessToken = await getAndroidPublisherAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const error = await res.text();
    return { valid: false, error: error || `HTTP ${res.status}` };
  }
  const data = await res.json();
  if (data && data.expiryTimeMillis && (!data.cancelReason || data.cancelReason === 0)) {
    const expiresAt = parseInt(data.expiryTimeMillis, 10);
    if (expiresAt > Date.now()) {
      return { valid: true, expiresAt };
    }
    return { valid: false, error: "Subscription expired" };
  }
  return { valid: false, error: "Invalid or cancelled subscription" };
}

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof subscriptionRestoreSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { platform, purchases, receiptData } = body;

    try {
      if (platform === "android") {
        if (!purchases || purchases.length === 0) {
          return errorResponse("Missing purchases for Android", 400, { correlationId: ctx.correlationId });
        }

        let restoredSubscription: { plan: AppPlanId; expiresAt: number; productId: string } | null = null;
        let highestTier = 0;
        const restoredDetails = [];
        
        for (const { productId, purchaseToken } of purchases) {
          const result = await validateGooglePurchase(productId, purchaseToken);
          if (result.valid) {
            const resolved = resolvePlanFromProductId("android", productId);
            const plan = resolved?.planId as AppPlanId | undefined;
            const tier = plan === "premiumPlus" ? 2 : plan === "premium" ? 1 : 0;

            if (plan && tier >= highestTier) {
              if (tier > highestTier || !restoredSubscription || (result.expiresAt || 0) > restoredSubscription.expiresAt) {
                highestTier = tier;
                restoredSubscription = { plan, expiresAt: result.expiresAt!, productId };
              }
            }
            restoredDetails.push({ productId, plan: plan ?? null, expiresAt: result.expiresAt });
          }
        }
        
        if (restoredSubscription) {
          await db.collection("users").doc(userId).set(
            { subscriptionPlan: restoredSubscription.plan, subscriptionExpiresAt: restoredSubscription.expiresAt, updatedAt: Date.now() },
            { merge: true }
          );
        }
        
        return successResponse({
          message: restoredSubscription ? "Subscription restored successfully" : "No active subscriptions found",
          restored: !!restoredSubscription,
          subscription: restoredSubscription,
          purchasesFound: purchases.length,
          restoredDetails,
        }, 200, ctx.correlationId);
      }

      if (platform === "ios") {
        if (!receiptData) {
          return errorResponse("Missing receiptData for iOS", 400, { correlationId: ctx.correlationId });
        }

        const result = await validateAppleReceipt(receiptData);
        if (!result.valid) {
          return errorResponse(result.error || "Invalid Apple receipt", 400, { correlationId: ctx.correlationId });
        }

        let restoredSubscription: { plan: AppPlanId; expiresAt: number; productId: string } | null = null;
        let highestTier = 0;
        const restoredDetails = [];

        for (const subscription of result.subscriptions || []) {
          const resolved = resolvePlanFromProductId("ios", subscription.productId);
          const plan = resolved?.planId as AppPlanId | undefined;
          const tier = plan === "premiumPlus" ? 2 : plan === "premium" ? 1 : 0;

          if (plan && tier >= highestTier) {
            if (tier > highestTier || !restoredSubscription || subscription.expiresAt > restoredSubscription.expiresAt) {
              highestTier = tier;
              restoredSubscription = { plan, expiresAt: subscription.expiresAt, productId: subscription.productId };
            }
          }
          restoredDetails.push({ productId: subscription.productId, plan: plan ?? null, expiresAt: subscription.expiresAt });
        }

        if (restoredSubscription) {
          await db.collection("users").doc(userId).set(
            { subscriptionPlan: restoredSubscription.plan, subscriptionExpiresAt: restoredSubscription.expiresAt, updatedAt: Date.now() },
            { merge: true }
          );
        }

        return successResponse({
          message: restoredSubscription ? "Subscription restored successfully" : "No active subscriptions found",
          restored: !!restoredSubscription,
          subscription: restoredSubscription,
          subscriptionsFound: result.subscriptions?.length || 0,
          restoredDetails,
        }, 200, ctx.correlationId);
      }

      return errorResponse("Unsupported platform or missing validation", 400, { correlationId: ctx.correlationId });
    } catch (error) {
      console.error("subscription/restore error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to restore purchases", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: subscriptionRestoreSchema,
    rateLimit: { identifier: "subscription_restore", maxRequests: 10 }
  }
);
