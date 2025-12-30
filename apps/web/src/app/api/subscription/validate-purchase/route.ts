import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { getAndroidPublisherAccessToken } from "@/lib/googlePlay";
import { subscriptionValidatePurchaseSchema } from "@/lib/validation/apiSchemas/subscription";
import {
  IAP_PRODUCT_IDS,
  resolvePlanFromProductId,
  type AppPlanId,
} from "@/lib/subscription/catalog";

// Apple App Store receipt validation helper
async function validateAppleReceipt(receiptData: string): Promise<{
  valid: boolean;
  productId?: string;
  expiresAt?: number;
  transactionId?: string;
  originalTransactionId?: string;
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

  const candidates = [
    ...(Array.isArray(result.latest_receipt_info) ? result.latest_receipt_info : []),
    ...(Array.isArray(result.receipt?.in_app) ? result.receipt.in_app : []),
  ];

  const known = new Set(
    [
      ...IAP_PRODUCT_IDS.ios.premium.monthly,
      ...IAP_PRODUCT_IDS.ios.premium.yearly,
      ...IAP_PRODUCT_IDS.ios.premiumPlus.monthly,
      ...IAP_PRODUCT_IDS.ios.premiumPlus.yearly,
    ].filter(Boolean)
  );

  let latestPurchase: any = null;
  let latestExpiresAt = 0;

  for (const purchase of candidates) {
    const productId = purchase?.product_id;
    const expiresStr = purchase?.expires_date_ms;
    if (!productId || !known.has(productId) || !expiresStr) continue;
    const expiresAt = parseInt(expiresStr, 10);
    if (Number.isFinite(expiresAt) && expiresAt > latestExpiresAt) {
      latestExpiresAt = expiresAt;
      latestPurchase = purchase;
    }
  }

  if (!latestPurchase || latestExpiresAt <= nowTimestamp()) {
    return { valid: false, error: "No active subscription found" };
  }

  return {
    valid: true,
    productId: latestPurchase.product_id,
    expiresAt: latestExpiresAt,
    transactionId: latestPurchase.transaction_id,
    originalTransactionId: latestPurchase.original_transaction_id,
  };
}

// Google Play API validation helper
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
    if (expiresAt > nowTimestamp()) {
      return { valid: true, expiresAt };
    }
    return { valid: false, error: "Subscription expired" };
  }
  return { valid: false, error: "Invalid or cancelled subscription" };
}

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof subscriptionValidatePurchaseSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { platform, productId, purchaseToken, receiptData } = body;

    let validationResult;
    let plan: AppPlanId;
    let expiresAt: number;

    try {
      if (platform === "android") {
        if (!productId || !purchaseToken) {
          return errorResponse("Missing productId or purchaseToken for Android", 400, { correlationId: ctx.correlationId });
        }

        validationResult = await validateGooglePurchase(productId, purchaseToken);
        if (!validationResult.valid) {
          return errorResponse(validationResult.error || "Invalid purchase", 400, { correlationId: ctx.correlationId });
        }

        const resolved = resolvePlanFromProductId("android", productId);
        plan = (resolved?.planId as AppPlanId | undefined) || "free";
        if (plan === "free") {
          return errorResponse("Invalid product ID", 400, { correlationId: ctx.correlationId });
        }

        expiresAt = validationResult.expiresAt!;
      } else if (platform === "ios") {
        if (!receiptData) {
          return errorResponse("Missing receiptData for iOS", 400, { correlationId: ctx.correlationId });
        }

        validationResult = await validateAppleReceipt(receiptData);
        if (!validationResult.valid) {
          return errorResponse(validationResult.error || "Invalid receipt", 400, { correlationId: ctx.correlationId });
        }

        const resolved = resolvePlanFromProductId("ios", validationResult.productId!);
        plan = (resolved?.planId as AppPlanId | undefined) || "free";
        if (plan === "free") {
          return errorResponse("Invalid product ID", 400, { correlationId: ctx.correlationId });
        }

        expiresAt = validationResult.expiresAt!;
      } else {
        return errorResponse("Unsupported platform", 400, { correlationId: ctx.correlationId });
      }

      await db.collection("users").doc(userId).set(
        {
          subscriptionPlan: plan,
          subscriptionExpiresAt: expiresAt,
          updatedAt: nowTimestamp(),
        },
        { merge: true }
      );

      return successResponse({
        message: "Purchase validated successfully",
        subscription: { plan, expiresAt, isActive: true },
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/validate-purchase error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to validate purchase", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: subscriptionValidatePurchaseSchema,
    rateLimit: { identifier: "subscription_validate_purchase", maxRequests: 10 }
  }
);
