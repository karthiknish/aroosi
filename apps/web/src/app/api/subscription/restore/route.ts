import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";
import { getAndroidPublisherAccessToken } from "@/lib/googlePlay";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";

// Apple App Store receipt validation helper
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

  // Try production first
  let response = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  let result = await response.json();

  // If production fails with sandbox receipt, try sandbox
  if (result.status === 21007) {
    response = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    result = await response.json();
  }

  if (result.status !== 0) {
    return {
      valid: false,
      error: `Apple validation failed with status ${result.status}`,
    };
  }

  const subscriptions = [];
  const inAppPurchases = result.receipt?.in_app || [];

  for (const purchase of inAppPurchases) {
    if (
      purchase.product_id === "com.aroosi.premium.monthly" ||
      purchase.product_id === "com.aroosi.premiumplus.monthly"
    ) {
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

// Google Play API validation helper (same as in purchase endpoint)
async function validateGooglePurchase(
  productId: string,
  purchaseToken: string
): Promise<{ valid: boolean; expiresAt?: number; error?: string }> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    return {
      valid: false,
      error: "Google Play package name not configured",
    };
  }
  const accessToken = await getAndroidPublisherAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    return { valid: false, error: error || `HTTP ${res.status}` };
  }
  const data = await res.json();
  if (
    data &&
    data.expiryTimeMillis &&
    (!data.cancelReason || data.cancelReason === 0)
  ) {
    const expiresAt = parseInt(data.expiryTimeMillis, 10);
    if (expiresAt > Date.now()) {
      return { valid: true, expiresAt };
    }
    return { valid: false, error: "Subscription expired" };
  }
  return { valid: false, error: "Invalid or cancelled subscription" };
}

export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  try {
    const userId = user.id;

    // Cookie-only: use convex helpers; no bearer tokens

    // Query the profile by user ID (optional, for audit/logging)
    // const profile = await convex.query(api.profiles.getProfileByUserId, { userId });

    // Safely parse JSON body: allow empty body without throwing
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";
    const contentLength = request.headers.get("content-length");
    const hasBody = contentLength ? parseInt(contentLength, 10) > 0 : false;
    if (hasBody && contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON in request body", 400);
      }
    }

    const { purchases, platform, receiptData } = body;

    if (!platform) {
      return errorResponse("Missing platform", 400);
    }

    if (
      platform === "android" &&
      (!Array.isArray(purchases) || purchases.length === 0)
    ) {
      return errorResponse("Missing purchases for Android", 400);
    }

    if (platform === "ios" && !receiptData) {
      return errorResponse("Missing receiptData for iOS", 400);
    }

    // Only support Android for now
    if (platform === "android") {
      let restoredSubscription = null;
      let highestTier = 0;
      const restoredDetails = [];
      for (const { productId, purchaseToken } of purchases) {
        const result = await validateGooglePurchase(productId, purchaseToken);
        if (result.valid) {
          // Map productId to plan and tier
          const productPlanMap: Record<
            string,
            { plan: "premium" | "premiumPlus"; tier: number }
          > = {
            // Legacy IDs
            aroosi_premium_monthly: { plan: "premium", tier: 1 },
            aroosi_premium_plus_monthly: { plan: "premiumPlus", tier: 2 },
            // New Play Console product IDs
            premium: { plan: "premium", tier: 1 },
            premiumplus: { plan: "premiumPlus", tier: 2 },
          };
          const planInfo = productPlanMap[productId];
          if (planInfo && planInfo.tier > highestTier) {
            highestTier = planInfo.tier;
            restoredSubscription = {
              plan: planInfo.plan,
              expiresAt: result.expiresAt,
              productId,
            };
          }
          restoredDetails.push({
            productId,
            plan: planInfo?.plan,
            expiresAt: result.expiresAt,
          });
        }
      }
      if (restoredSubscription) {
        await db.collection("users").doc(userId).set(
          {
            subscriptionPlan: restoredSubscription.plan,
            subscriptionExpiresAt: restoredSubscription.expiresAt,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
      return successResponse({
        message: restoredSubscription
          ? "Subscription restored successfully"
          : "No active subscriptions found",
        restored: !!restoredSubscription,
        subscription: restoredSubscription,
        purchasesFound: purchases.length,
        restoredDetails,
      });
    }

    // Handle iOS receipt validation
    if (platform === "ios") {
      const result = await validateAppleReceipt(receiptData);
      if (!result.valid) {
        return errorResponse(result.error || "Invalid Apple receipt", 400);
      }

      let restoredSubscription = null;
      let highestTier = 0;
      const restoredDetails = [];

      for (const subscription of result.subscriptions || []) {
        // Map iOS productId to plan and tier
        const productPlanMap: Record<
          string,
          { plan: "premium" | "premiumPlus"; tier: number }
        > = {
          "com.aroosi.premium.monthly": { plan: "premium", tier: 1 },
          "com.aroosi.premiumplus.monthly": { plan: "premiumPlus", tier: 2 },
        };

        const planInfo = productPlanMap[subscription.productId];
        if (planInfo && planInfo.tier > highestTier) {
          highestTier = planInfo.tier;
          restoredSubscription = {
            plan: planInfo.plan,
            expiresAt: subscription.expiresAt,
            productId: subscription.productId,
          };
        }

        restoredDetails.push({
          productId: subscription.productId,
          plan: planInfo?.plan,
          expiresAt: subscription.expiresAt,
        });
      }

      if (restoredSubscription) {
        await db.collection("users").doc(userId).set(
          {
            subscriptionPlan: restoredSubscription.plan,
            subscriptionExpiresAt: restoredSubscription.expiresAt,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }

      return successResponse({
        message: restoredSubscription
          ? "Subscription restored successfully"
          : "No active subscriptions found",
        restored: !!restoredSubscription,
        subscription: restoredSubscription,
        subscriptionsFound: result.subscriptions?.length || 0,
        restoredDetails,
      });
    }

    return errorResponse("Unsupported platform or missing validation", 400);
  } catch (error) {
    console.error("Error restoring purchases:", error);
    return errorResponse("Failed to restore purchases", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
