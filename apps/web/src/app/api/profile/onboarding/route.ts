import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";

/**
 * GET /api/profile/onboarding
 * Retrieves the current onboarding progress for the authenticated user.
 */
export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const userId = ctx.user.id;
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) {
      return errorResponse("User not found", 404, { correlationId: ctx.correlationId });
    }
    const data = doc.data() || {};
    return successResponse({
      onboarding: data.onboardingPartial || { step: 1, completed: false }
    }, 200, ctx.correlationId);
  } catch (e) {
    console.error("Onboarding GET error", e);
    return errorResponse("Failed to fetch onboarding state", 500, { correlationId: ctx.correlationId });
  }
});

/**
 * PATCH /api/profile/onboarding
 * Updates the onboarding progress for the authenticated user.
 */
export const PATCH = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  const userId = ctx.user.id;
  try {
    const { step, data, completed } = body;
    
    if (step === undefined && data === undefined && completed === undefined) {
      return errorResponse("No updates provided", 400, { correlationId: ctx.correlationId });
    }

    const updates: any = {
      updatedAt: nowTimestamp()
    };

    if (step !== undefined || data !== undefined || completed !== undefined) {
      const doc = await db.collection("users").doc(userId).get();
      const existingOnboarding = doc.exists ? (doc.data()?.onboardingPartial || {}) : {};
      
      updates.onboardingPartial = {
        ...existingOnboarding,
        ...(data || {}),
        updatedAt: nowTimestamp()
      };
      
      if (step !== undefined) updates.onboardingPartial.step = step;
      if (completed !== undefined) updates.onboardingPartial.completed = completed;
      
      // If completed, also set isProfileComplete on the main user object
      if (completed === true) {
        updates.isProfileComplete = true;
      }
    }
    
    await db.collection("users").doc(userId).set(updates, { merge: true });
    
    return successResponse({ message: "Onboarding progress saved" }, 200, ctx.correlationId);
  } catch (e) {
    console.error("Onboarding PATCH error", e);
    return errorResponse("Failed to save onboarding progress", 500, { correlationId: ctx.correlationId });
  }
}, {
  rateLimit: { identifier: "onboarding_update", maxRequests: 30 }
});
