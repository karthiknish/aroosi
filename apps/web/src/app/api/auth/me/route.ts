import {
  createApiHandler,
  successResponse,
  ApiContext
} from "@/lib/api/handler";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    const { user, correlationId } = ctx;
    
    if (!user) {
      // 401 but success: true, user: null is the expected "not logged in" response for this endpoint
      return successResponse({ user: null }, 200, correlationId);
    }

    try {
      // ctx.user already contains id, email, role, etc.
      // We return the expected structure for the frontend
      return successResponse({
        user: {
          id: user.id,
          uid: user.id,
          email: user.email || "",
          role: user.role,
          isAdmin: user.isAdmin,
          isProfileComplete: user.isProfileComplete,
          // Note: we might miss some details like fullName here if not in requireAuth payload,
          // but normalized user should be enough for "me". 
          // If more is needed, requireAuth should fetch it.
        },
      }, 200, correlationId);
    } catch (error) {
      console.error("[auth.me] fatal error", { error, correlationId });
      return successResponse({ user: null }, 200, correlationId);
    }
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "auth_me", maxRequests: 60 }
  }
);