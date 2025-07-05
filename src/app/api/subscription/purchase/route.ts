import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";

// Type for Apple receipt item
interface AppleReceiptItem {
  product_id: string;
  expires_date_ms?: string;
  [key: string]: unknown;
}

// Apple App Store receipt validation helper
async function validateAppleReceipt(
  productId: string,
  receiptData: string,
): Promise<{ valid: boolean; expiresAt?: number; error?: string }> {
  const appleSharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!appleSharedSecret) {
    return {
      valid: false,
      error: "Apple shared secret not configured",
    };
  }

  // Use production URL first, fallback to sandbox if needed
  const productionUrl = "https://buy.itunes.apple.com/verifyReceipt";
  const sandboxUrl = "https://sandbox.itunes.apple.com/verifyReceipt";

  const requestBody = {
    "receipt-data": receiptData,
    password: appleSharedSecret,
    "exclude-old-transactions": true,
  };

  try {
    // Try production first
    let response = await fetch(productionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    let data = await response.json();

    // If production returns sandbox receipt error, try sandbox
    if (data.status === 21007) {
      response = await fetch(sandboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      data = await response.json();
    }

    if (data.status !== 0) {
      return {
        valid: false,
        error: `Apple validation failed with status: ${data.status}`,
      };
    }

    // Find the subscription in the receipt
    const latestReceiptInfo = data.latest_receipt_info || [];
    const subscription = latestReceiptInfo.find(
      (item: AppleReceiptItem) => item.product_id === productId,
    );

    if (!subscription) {
      return {
        valid: false,
        error: "Subscription not found in receipt",
      };
    }

    // Check if subscription is active
    const expiresDate = parseInt(subscription.expires_date_ms, 10);
    const now = Date.now();

    if (expiresDate > now) {
      return {
        valid: true,
        expiresAt: expiresDate,
      };
    } else {
      return {
        valid: false,
        error: "Subscription expired",
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

// Google Play API validation helper
async function validateGooglePurchase(
  productId: string,
  purchaseToken: string,
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
    headers: { Authorization: `Bearer ${apiKey}` },
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
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    const { productId, purchaseToken, platform, receiptData } =
      await request.json();
    if (!productId || !purchaseToken) {
      return errorResponse("Missing productId or purchaseToken", 400);
    }

    // For iOS, we need receiptData instead of purchaseToken
    if (platform === "ios" && !receiptData) {
      return errorResponse("Missing receiptData for iOS purchase", 400);
    }

    // Validate product ID and map to subscription plan
    const productPlanMap: Record<string, "premium" | "premiumPlus"> = {
      aroosi_premium_monthly: "premium",
      aroosi_premium_plus_monthly: "premiumPlus",
    };
    const plan = productPlanMap[productId];
    if (!plan) {
      return errorResponse("Invalid product ID", 400);
    }

    // Validate purchase with Google Play if platform is android
    if (platform === "android") {
      const result = await validateGooglePurchase(productId, purchaseToken);
      if (!result.valid) {
        return errorResponse(
          `Google Play validation failed: ${result.error || "Unknown error"}`,
          400,
        );
      }
      // Use the expiry from Google
      const expiresAt =
        result.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000;
      await convex.mutation(api.users.updateProfile, {
        updates: {
          subscriptionPlan: plan,
          subscriptionExpiresAt: expiresAt,
          updatedAt: Date.now(),
        },
      });
      // Optionally notify admin
      const profile = await convex.query(api.profiles.getProfileByUserId, {
        userId: userId as Id<"users">,
      });
      if (profile && typeof profile.email === "string") {
        try {
          await Notifications.subscriptionPurchasedAdmin(
            profile as import("@/types/profile").Profile,
            plan,
          );
        } catch (e) {
          console.error("Failed to send admin subscription notification", e);
        }
      }
      return successResponse({
        message: "Purchase processed successfully",
        plan,
        expiresAt,
        purchaseToken,
      });
    }

    // Apple receipt validation for iOS
    if (platform === "ios") {
      const result = await validateAppleReceipt(productId, purchaseToken);
      if (!result.valid) {
        return errorResponse(
          `Apple receipt validation failed: ${result.error || "Unknown error"}`,
          400,
        );
      }
      // Use the expiry from Apple
      const expiresAt =
        result.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000;
      await convex.mutation(api.users.updateProfile, {
        updates: {
          subscriptionPlan: plan,
          subscriptionExpiresAt: expiresAt,
          updatedAt: Date.now(),
        },
      });
      // Optionally notify admin
      const profile = await convex.query(api.profiles.getProfileByUserId, {
        userId: userId as Id<"users">,
      });
      if (profile && typeof profile.email === "string") {
        try {
          await Notifications.subscriptionPurchasedAdmin(
            profile as import("@/types/profile").Profile,
            plan,
          );
        } catch (e) {
          console.error("Failed to send admin subscription notification", e);
        }
      }
      return successResponse({
        message: "Purchase processed successfully",
        plan,
        expiresAt,
        purchaseToken,
      });
    }

    // Fallback for unsupported platforms
    return errorResponse("Unsupported platform or missing validation", 400);
  } catch (error) {
    console.error("Error processing purchase:", error);
    return errorResponse("Failed to process purchase", 500);
  }
}
