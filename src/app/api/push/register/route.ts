import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  try {
    const { token, deviceType } = await request.json();
    if (!token) return errorResponse("Missing token", 400);
    const docId = token.slice(0, 140); // shorten if huge
    await db
      .collection("pushTokens")
      .doc(docId)
      .set(
        {
          userId: user.id,
          token,
          deviceType: deviceType || "web",
          registeredAt: Date.now(),
          isActive: true,
        },
        { merge: true }
      );
    return successResponse({
      message: "Push token registered",
      token,
      registeredAt: Date.now(),
    });
  } catch (error) {
    console.error("Error registering push token:", error);
    return errorResponse("Failed to register push token", 500);
  }
});

export const DELETE = withFirebaseAuth(async (user, request: NextRequest) => {
  try {
    const { token } = await request.json();
    if (!token) return errorResponse("Missing token", 400);
    const docId = token.slice(0, 140);
    await db.collection("pushTokens").doc(docId).set(
      {
        userId: user.id,
        token,
        isActive: false,
        unregisteredAt: Date.now(),
      },
      { merge: true }
    );
    return successResponse({
      message: "Push token unregistered",
      token,
      unregisteredAt: Date.now(),
    });
  } catch (error) {
    console.error("Error unregistering push token:", error);
    return errorResponse("Failed to unregister push token", 500);
  }
});
