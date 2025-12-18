import { cookies } from "next/headers";
import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { verifyFirebaseIdToken, getFirebaseUser } from "@/lib/firebaseAdmin";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    try {
      const cookieStore = await cookies();
      let token: string | null | undefined = cookieStore.get("firebaseAuthToken")?.value;

      // Authorization: Bearer <token> fallback
      if (!token) {
        const authz = ctx.request.headers.get("authorization") || ctx.request.headers.get("Authorization");
        if (authz && authz.toLowerCase().startsWith("bearer ")) {
          token = authz.slice(7).trim() || null;
        }
      }

      if (!token) {
        return successResponse({ user: null }, 401, ctx.correlationId);
      }

      const decodedToken = await verifyFirebaseIdToken(token);
      const userId = decodedToken.uid;
      if (!userId) {
        return successResponse({ user: null }, 401, ctx.correlationId);
      }

      const userData = await getFirebaseUser(userId);
      const signInProvider = (decodedToken as any)?.firebase?.sign_in_provider;
      const exp = (decodedToken as any)?.exp;
      const nowSec = Math.floor(Date.now() / 1000);
      const secondsUntilExpiry = typeof exp === "number" ? exp - nowSec : null;

      return successResponse({
        user: {
          id: userId,
          email: userData.email || "",
          role: userData.role || "user",
          emailVerified: userData.emailVerified || false,
          createdAt: userData.createdAt || Date.now(),
          fullName: userData.fullName || userData.displayName || undefined,
          signInProvider: signInProvider || null,
          tokenExpiresInSeconds: secondsUntilExpiry,
          profile: userData ? { id: userId, fullName: userData.fullName || undefined } : null,
          needsProfile: !userData,
        },
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("auth/me error", { error, correlationId: ctx.correlationId });
      return successResponse({ user: null }, 401, ctx.correlationId);
    }
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "auth_me", maxRequests: 60 }
  }
);