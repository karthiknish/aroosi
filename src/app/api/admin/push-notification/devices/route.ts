import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";

// This endpoint previously proxied to Convex for listing push devices.
// Convex has been removed. Return 410 Gone to signal deprecation until
// a Firestore-native replacement is implemented.
export async function GET(request: NextRequest) {
  try {
    const { role } = await requireAuth(request);
    if ((role || "user") !== "admin")
      return errorResponse("Admin privileges required", 403);
  } catch (e) {
    return errorResponse("Unauthorized", 401);
  }
  return errorResponse(
    "Push device listing deprecated (Convex removed) - implement Firestore version",
    410
  );
}
