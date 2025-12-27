import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { Notifications } from "@/lib/notify";
import type { Profile } from "@aroosi/shared/types";
import { db } from "@/lib/firebaseAdmin";
import { getAndroidPublisherAccessToken } from "@/lib/googlePlay";

interface AppleReceiptItem {
  product_id: string;
  expires_date_ms?: string;
  [key: string]: unknown;
}

async function validateAppleReceipt(
  productId: string,
  receiptData: string
): Promise<{ valid: boolean; expiresAt?: number; error?: string }> {
  const appleSharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!appleSharedSecret) {
    return { valid: false, error: "Apple shared secret not configured" };
  }

  const productionUrl = "https://buy.itunes.apple.com/verifyReceipt";
  const sandboxUrl = "https://sandbox.itunes.apple.com/verifyReceipt";
  const requestBody = {
    "receipt-data": receiptData,
    password: appleSharedSecret,
    "exclude-old-transactions": true,
  };

  try {
    let response = await fetch(productionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    let data = await response.json();

    if (data.status === 21007) {
      response = await fetch(sandboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      data = await response.json();
    }

    if (data.status !== 0) {
      return { valid: false, error: `Apple validation failed with status: ${data.status}` };
    }

    const latestReceiptInfo = data.latest_receipt_info || [];
    const subscription = latestReceiptInfo.find((item: AppleReceiptItem) => item.product_id === productId);

    if (!subscription) {
      return { valid: false, error: "Subscription not found in receipt" };
    }

    const expiresDate = parseInt(subscription.expires_date_ms, 10);
    if (expiresDate > Date.now()) {
      return { valid: true, expiresAt: expiresDate };
    }
    return { valid: false, error: "Subscription expired" };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Validation failed" };
  }
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

const purchaseSchema = z.object({
  productId: z.string().min(1),
  purchaseToken: z.string().min(1),
  platform: z.enum(["android", "ios"]),
  receiptData: z.string().optional(),
});

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof purchaseSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { productId, purchaseToken, platform, receiptData } = body;

    if (platform === "ios" && !receiptData) {
      return errorResponse("Missing receiptData for iOS purchase", 400, { correlationId: ctx.correlationId });
    }

    const productPlanMap: Record<string, "premium" | "premiumPlus"> = {
      aroosi_premium_monthly: "premium",
      aroosi_premium_plus_monthly: "premiumPlus",
      premium: "premium",
      premiumplus: "premiumPlus",
    };
    const plan = productPlanMap[productId];
    if (!plan) {
      return errorResponse("Invalid product ID", 400, { correlationId: ctx.correlationId });
    }

    try {
      if (platform === "android") {
        const result = await validateGooglePurchase(productId, purchaseToken);
        if (!result.valid) {
          return errorResponse(`Google Play validation failed: ${result.error || "Unknown error"}`, 400, { correlationId: ctx.correlationId });
        }
        const expiresAt = result.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000;
        await db.collection("users").doc(userId).set(
          { subscriptionPlan: plan, subscriptionExpiresAt: expiresAt, updatedAt: Date.now() },
          { merge: true }
        );
        
        const profileSnap = await db.collection("users").doc(userId).get();
        const profile = profileSnap.exists ? { _id: profileSnap.id, ...(profileSnap.data() as any) } : null;
        if (profile?.email) {
          try {
            await Notifications.subscriptionPurchasedAdmin(profile as Profile, plan);
          } catch {}
        }
        
        return successResponse({ message: "Purchase processed successfully", plan, expiresAt, purchaseToken }, 200, ctx.correlationId);
      }

      if (platform === "ios") {
        const result = await validateAppleReceipt(productId, receiptData!);
        if (!result.valid) {
          return errorResponse(`Apple receipt validation failed: ${result.error || "Unknown error"}`, 400, { correlationId: ctx.correlationId });
        }
        const expiresAt = result.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000;
        await db.collection("users").doc(userId).set(
          { subscriptionPlan: plan, subscriptionExpiresAt: expiresAt, updatedAt: Date.now() },
          { merge: true }
        );
        
        const profileSnap = await db.collection("users").doc(userId).get();
        const profile = profileSnap.exists ? { _id: profileSnap.id, ...(profileSnap.data() as any) } : null;
        if (profile?.email) {
          try {
            await Notifications.subscriptionPurchasedAdmin(profile as Profile, plan);
          } catch {}
        }
        
        return successResponse({ message: "Purchase processed successfully", plan, expiresAt, purchaseToken }, 200, ctx.correlationId);
      }

      return errorResponse("Unsupported platform or missing validation", 400, { correlationId: ctx.correlationId });
    } catch (error) {
      console.error("subscription/purchase error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to process purchase", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: purchaseSchema,
    rateLimit: { identifier: "subscription_purchase", maxRequests: 10 }
  }
);
