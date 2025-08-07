import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchMutation } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    const { playerId, deviceType, deviceToken } = await request.json();
    if (!playerId) return errorResponse("Missing playerId", 400);

    const registrationId = await fetchMutation(api.pushNotifications.registerDevice, {
      userId: userId as Id<"users">,
      playerId,
      deviceType: deviceType || "unknown",
      deviceToken: deviceToken || undefined,
    } as any);

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
    const { userId } = await requireAuth(request);

    const { playerId } = await request.json();
    if (!playerId) return errorResponse("Missing playerId", 400);

    // Remove registration from Convex
    const unregistered = await fetchMutation(api.pushNotifications.unregisterDevice, {
      userId: userId as Id<"users">,
      playerId,
    } as any);

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
