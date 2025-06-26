import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    client.setAuth(token);

    const { playerId, deviceType, deviceToken } = await request.json();
    if (!playerId) return errorResponse("Missing playerId", 400);



    // Store registration in Convex
    const registrationId = await client.mutation(api.pushNotifications.registerDevice, {
      userId: userId as Id<"users">,
      playerId,
      deviceType: deviceType || "unknown",
      deviceToken: deviceToken || undefined,
    });

    return successResponse({
      message: "Push notifications registered successfully",
      registrationId,
      playerId,
      registeredAt: Date.now(),
      features: [
        "New message notifications",
        "New interest notifications",
        "Match notifications",
        "Profile view notifications (Premium Plus)",
      ],
    });
  } catch (error) {
    console.error("Error registering push notifications:", error);
    return errorResponse("Failed to register push notifications", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    client.setAuth(token);

    const { playerId } = await request.json();
    if (!playerId) return errorResponse("Missing playerId", 400);

    // Remove registration from Convex
    const unregistered = await client.mutation(api.pushNotifications.unregisterDevice, {
      userId: userId as Id<"users">,
      playerId,
    });

    return successResponse({
      message: unregistered ? "Push notifications unregistered successfully" : "No active registration found",
      playerId,
      unregistered,
      unregisteredAt: Date.now(),
    });
  } catch (error) {
    console.error("Error unregistering push notifications:", error);
    return errorResponse("Failed to unregister push notifications", 500);
  }
}
