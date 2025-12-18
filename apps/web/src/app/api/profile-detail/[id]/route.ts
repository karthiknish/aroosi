import { NextRequest } from "next/server";
import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/app/api/_utils/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/profile-detail/[id]
 * Returns detailed profile data for a given user.
 * Auth is optional - authenticated users get additional context.
 */
export const GET = createApiHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    try {
      // Extract user ID from route params
      const params = routeCtx ? await routeCtx.params : null;
      const id = params?.id;

      if (!id) {
        // Fallback: parse from URL
        const url = new URL(ctx.request.url);
        const urlId = url.pathname.split("/").pop();
        if (!urlId) {
          return errorResponse("User ID is required", 400, { correlationId: ctx.correlationId });
        }
      }

      const userId = id || new URL(ctx.request.url).pathname.split("/").pop()!;

      // Optional auth - get currently authenticated user if available
      let authedUserId: string | null = null;
      try {
        const session = await requireSession(ctx.request);
        if (!("errorResponse" in session)) {
          authedUserId = session.userId;
        }
      } catch {
        // Auth is optional, continue without it
      }

      const userDoc = await db.collection("users").doc(userId).get();
      
      if (!userDoc.exists) {
        return errorResponse("Profile not found", 404, { 
          correlationId: ctx.correlationId,
          code: "NOT_FOUND" 
        });
      }

      const profileData = userDoc.data();

      // Build response with legacy shape parity
      const responsePayload = {
        currentUser: authedUserId ? { id: authedUserId } : null,
        profileData: profileData || null,
        isBlocked: false, // TODO: integrate block lookup if required
        isMutualInterest: false, // TODO: integrate interest matching
        sentInterest: [],
      };

      return successResponse(responsePayload, 200, ctx.correlationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("profile-detail GET error", {
        error: message,
        correlationId: ctx.correlationId,
        durationMs: Date.now() - ctx.startTime,
      });
      return errorResponse("Failed to fetch profile", 500, { 
        correlationId: ctx.correlationId 
      });
    }
  },
  {
    requireAuth: false, // Auth is optional for this endpoint
    rateLimit: { identifier: "profile_detail", maxRequests: 60 }
  }
);
