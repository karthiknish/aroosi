import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { engagementProfilesSchema } from "@/lib/validation/apiSchemas/engagement";

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof engagementProfilesSchema>
  ) => {
    const { userIds } = body;

    try {
      const results: Array<{
        userId: string;
        fullName?: string | null;
        city?: string | null;
        imageUrl?: string | null;
      }> = [];

      for (const uid of userIds) {
        try {
          const doc = await db.collection("users").doc(uid).get();
          if (!doc.exists) continue;
          
          const data = doc.data() as any;
          results.push({
            userId: uid,
            fullName: data.fullName || null,
            city: data.city || null,
            imageUrl: Array.isArray(data.profileImageUrls) && data.profileImageUrls.length > 0
              ? data.profileImageUrls[0]
              : null,
          });
        } catch {}
      }

      return successResponse(results, 200, ctx.correlationId);
    } catch (e) {
      console.error("engagement/profiles POST error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch profiles", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: engagementProfilesSchema,
    rateLimit: { identifier: "engagement_profiles", maxRequests: 30 }
  }
);
