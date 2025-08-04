import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

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
    'receipt-data': receiptData,
    'password': sharedSecret,
    'exclude-old-transactions': true
  };

  // Try production first
  let response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  let result = await response.json();

  // If production fails with sandbox receipt, try sandbox
  if (result.status === 21007) {
    response = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    result = await response.json();
  }

  if (result.status !== 0) {
    return { valid: false, error: `Apple validation failed with status ${result.status}` };
  }

  // Find the latest subscription purchase
  const inAppPurchases = result.receipt?.in_app || [];
  let latestPurchase = null;
  let latestExpiresAt = 0;

  for (const purchase of inAppPurchases) {
    if (purchase.product_id === 'com.aroosi.premium.monthly' || 
        purchase.product_id === 'com.aroosi.premiumplus.monthly') {
      
      const expiresAt = parseInt(purchase.expires_date_ms);
      if (expiresAt > latestExpiresAt) {
        latestExpiresAt = expiresAt;
        latestPurchase = purchase;
      }
    }
  }

  if (!latestPurchase || latestExpiresAt <= Date.now()) {
    return { valid: false, error: "No active subscription found" };
  }

  return {
    valid: true,
    productId: latestPurchase.product_id,
    expiresAt: latestExpiresAt,
    transactionId: latestPurchase.transaction_id,
    originalTransactionId: latestPurchase.original_transaction_id
  };
}

// Google Play API validation helper
async function validateGooglePurchase(
  productId: string,
  purchaseToken: string
): Promise<{ valid: boolean; expiresAt?: number; error?: string }> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const apiKey = process.env.GOOGLE_PLAY_API_KEY;
  if (!packageName || !apiKey) {
    return {
      valid: false,
      error: "Google Play API credentials not configured",
    };
  }
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    // Cookie-only: do not set bearer on client

    const body = await request.json();
    const { platform, productId, purchaseToken, receiptData } = body;

    if (!platform) {
      return errorResponse("Missing platform", 400);
    }

    let validationResult;
    let plan: "premium" | "premiumPlus";
    let expiresAt: number;

    if (platform === "android") {
      if (!productId || !purchaseToken) {
        return errorResponse("Missing productId or purchaseToken for Android", 400);
      }

      validationResult = await validateGooglePurchase(productId, purchaseToken);
      if (!validationResult.valid) {
        return errorResponse(validationResult.error || "Invalid purchase", 400);
      }

      // Map Android productId to plan
      const productPlanMap: Record<string, "premium" | "premiumPlus"> = {
        aroosi_premium_monthly: "premium",
        aroosi_premium_plus_monthly: "premiumPlus",
      };
      
      plan = productPlanMap[productId];
      if (!plan) {
        return errorResponse("Invalid product ID", 400);
      }
      
      expiresAt = validationResult.expiresAt!;

    } else if (platform === "ios") {
      if (!receiptData) {
        return errorResponse("Missing receiptData for iOS", 400);
      }

      validationResult = await validateAppleReceipt(receiptData);
      if (!validationResult.valid) {
        return errorResponse(validationResult.error || "Invalid receipt", 400);
      }

      // Map iOS productId to plan
      const productPlanMap: Record<string, "premium" | "premiumPlus"> = {
        "com.aroosi.premium.monthly": "premium",
        "com.aroosi.premiumplus.monthly": "premiumPlus",
      };
      
      plan = productPlanMap[validationResult.productId!];
      if (!plan) {
        return errorResponse("Invalid product ID", 400);
      }
      
      expiresAt = validationResult.expiresAt!;

    } else {
      return errorResponse("Unsupported platform", 400);
    }

    // Update user profile with subscription
    await convex.mutation(api.users.updateProfile, {
      updates: {
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt,
        updatedAt: Date.now(),
      },
    });

    return successResponse({
      message: "Purchase validated successfully",
      subscription: {
        plan,
        expiresAt,
        isActive: true,
      },
    });

  } catch (error) {
    console.error("Error validating purchase:", error);
    return errorResponse("Failed to validate purchase", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}