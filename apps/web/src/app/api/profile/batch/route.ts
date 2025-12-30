import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  const { correlationId } = ctx;
  const { userIds } = body || {};

  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return successResponse([], 200, correlationId);
    }

    const results = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const snap = await db.collection("users").doc(userId).get();
          if (snap.exists) return { userId, profile: snap.data() };
        } catch (e) {
          console.error(`Error fetching profile for userId ${userId}:`, e);
        }
        return null;
      })
    );

    return successResponse(results.filter(Boolean), 200, correlationId);
  } catch (err: any) {
    console.error("[profile/batch] error", { correlationId, err });
    return errorResponse("Failed to fetch profiles", 500, { correlationId });
  }
});
