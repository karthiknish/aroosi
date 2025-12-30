import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { normalisePlan } from "@/lib/subscription/planLimits";
import {
  IAP_PRODUCT_IDS,
  planIdToTier,
  resolvePlanFromProductId,
  type AppPlanId,
} from "@/lib/subscription/catalog";
import type { Subscription } from "@aroosi/shared/types";

async function verifyAppleReceipt(receiptData: string): Promise<
  | { valid: false; error: string }
  | { valid: true; productId: string; expiresAt: number }
> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) return { valid: false, error: "Apple shared secret not configured" };

  const requestBody = {
    "receipt-data": receiptData,
    password: sharedSecret,
    "exclude-old-transactions": true,
  };

  const productionUrl = "https://buy.itunes.apple.com/verifyReceipt";
  const sandboxUrl = "https://sandbox.itunes.apple.com/verifyReceipt";

  try {
    let response = await fetch(productionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    let result = await response.json();
    if (result.status === 21007) {
      response = await fetch(sandboxUrl, {
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

    let latest: { product_id: string; expires_date_ms?: string } | null = null;
    let latestExpiresAt = 0;

    for (const purchase of candidates) {
      const productId = purchase?.product_id;
      const expiresStr = purchase?.expires_date_ms;
      if (!productId || !known.has(productId) || !expiresStr) continue;
      const expiresAt = parseInt(expiresStr, 10);
      if (Number.isFinite(expiresAt) && expiresAt > latestExpiresAt) {
        latestExpiresAt = expiresAt;
        latest = purchase;
      }
    }

    if (!latest || latestExpiresAt <= Date.now()) {
      return { valid: false, error: "No active subscription found" };
    }

    return { valid: true, productId: latest.product_id, expiresAt: latestExpiresAt };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Receipt validation failed" };
  }
}

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: any) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const platform = body?.platform as "ios" | "android" | undefined;

    if (!platform) {
      return errorResponse("Missing platform", 400, { correlationId: ctx.correlationId });
    }

    if (platform !== "ios") {
      return errorResponse("verify-receipt currently supports iOS only", 400, {
        correlationId: ctx.correlationId,
      });
    }

    const receiptData = (body?.receiptData || body?.receipt) as string | undefined;
    if (!receiptData) {
      return errorResponse("Missing receipt", 400, { correlationId: ctx.correlationId });
    }

    const verified = await verifyAppleReceipt(receiptData);
    if (!verified.valid) {
      return successResponse({ valid: false, error: verified.error }, 200, ctx.correlationId);
    }

    const resolved = resolvePlanFromProductId("ios", verified.productId);
    const plan: AppPlanId = resolved?.planId ? (normalisePlan(resolved.planId) as any) : "free";

    await db.collection(COLLECTIONS.USERS).doc(userId).set(
      {
        subscriptionPlan: plan,
        subscriptionExpiresAt: verified.expiresAt,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    const subscription: Subscription = {
      id: userId,
      tier: planIdToTier(plan),
      status: "active",
      features: [],
      startDate: new Date().toISOString(),
      endDate: new Date(verified.expiresAt).toISOString(),
      autoRenew: true,
    };

    return successResponse({ valid: true, subscription }, 200, ctx.correlationId);
  },
  { rateLimit: { identifier: "subscription_verify_receipt", maxRequests: 10 } }
);
