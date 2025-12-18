import { z } from "zod";
import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken } from "@/lib/firebaseAdmin";

const appealSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
  details: z.string().min(1, "Details are required").max(2000),
});

// Special handler that allows banned users to submit appeals
export const POST = createApiHandler(
  async (ctx: ApiContext, body: z.infer<typeof appealSchema>) => {
    // Manual auth that allows banned users
    const cookieStore = await cookies();
    let token: string | null | undefined = cookieStore.get("firebaseAuthToken")?.value;
    
    if (!token) {
      const authz = ctx.request.headers.get("authorization") || ctx.request.headers.get("Authorization");
      if (authz && authz.toLowerCase().startsWith("bearer ")) {
        token = authz.slice(7).trim() || null;
      }
    }
    
    if (!token) {
      return errorResponse("Authentication required", 401, { correlationId: ctx.correlationId });
    }

    let userId: string;
    try {
      const decodedToken = await verifyFirebaseIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return errorResponse("Invalid token", 401, { correlationId: ctx.correlationId });
    }

    const { reason, details } = body;

    try {
      const now = Date.now();
      const appealRef = db.collection(COLLECTIONS.APPEALS || "appeals").doc();
      await appealRef.set({
        id: appealRef.id,
        userId,
        reason,
        details,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return successResponse({ id: appealRef.id }, 200, ctx.correlationId);
    } catch (error) {
      console.error("appeals POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to submit appeal", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    requireAuth: false, // We handle auth manually to allow banned users
    bodySchema: appealSchema,
    rateLimit: { identifier: "appeals_submit", maxRequests: 5 }
  }
);
