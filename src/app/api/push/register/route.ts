import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  try {
    const { token, playerId, deviceType } = await request.json();
    const id = String(playerId || token || "").trim();
    if (!id) return errorResponse("Missing playerId/token", 400);
    const docId = id.slice(0, 140); // shorten if huge
    await db
      .collection("pushTokens")
      .doc(docId)
      .set(
        {
          userId: user.id,
          playerId: id,
          token: token || undefined,
          deviceType: deviceType || "web",
          registeredAt: Date.now(),
          isActive: true,
        },
        { merge: true }
      );
    return successResponse({
      message: "Push token registered",
      playerId: id,
      registeredAt: Date.now(),
    });
  } catch (error) {
    console.error("Error registering push token:", error);
    return errorResponse("Failed to register push token", 500);
  }
});

export const DELETE = withFirebaseAuth(async (user, request: NextRequest) => {
  try {
    const { token, playerId } = await request.json();
    const id = String(playerId || token || "").trim();
    if (!id) return errorResponse("Missing playerId/token", 400);
    const docId = id.slice(0, 140);
    await db
      .collection("pushTokens")
      .doc(docId)
      .set(
        {
          userId: user.id,
          playerId: id,
          token: token || undefined,
          isActive: false,
          unregisteredAt: Date.now(),
        },
        { merge: true }
      );
    return successResponse({
      message: "Push token unregistered",
      playerId: id,
      unregisteredAt: Date.now(),
    });
  } catch (error) {
    console.error("Error unregistering push token:", error);
    return errorResponse("Failed to unregister push token", 500);
  }
});
