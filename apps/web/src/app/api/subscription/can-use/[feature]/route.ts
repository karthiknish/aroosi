import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  monthKey,
  usageMonthlyId,
} from "@/lib/firestoreSchema";
import { getPlanLimits, featureRemaining } from "@/lib/subscription/planLimits";

const validFeatures = [
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
  "unread_counts",
] as const;

type Feature = (typeof validFeatures)[number];

interface RouteContext {
  params: Promise<{ feature: string }>;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const params = routeCtx ? await routeCtx.params : null;
    const rawFeature = params?.feature;
    const feature = rawFeature as Feature;

    if (!rawFeature || !validFeatures.includes(feature)) {
      return errorResponse("Invalid feature", 400, {
        reason: `Must be one of: ${validFeatures.join(", ")}`,
        feature: rawFeature ?? null,
        correlationId: ctx.correlationId,
      });
    }

    try {
      const profileDoc = await db.collection("users").doc(userId).get();
      if (!profileDoc.exists) {
        return errorResponse("Profile not found", 404, { correlationId: ctx.correlationId });
      }
      
      const profile = profileDoc.data() as any;
      const plan = profile.subscriptionPlan || "free";
      const limits = getPlanLimits(plan);
      const limit = limits[feature];
      let currentUsage = 0;
      const month = monthKey();
      
      if (feature === "profile_view" || feature === "search_performed") {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        try {
          const snap = await db
            .collection(COL_USAGE_EVENTS)
            .where("userId", "==", userId)
            .where("timestamp", ">=", since)
            .get();
          snap.docs.forEach((d: any) => {
            const data = d.data() as any;
            if (data.feature === feature) currentUsage++;
          });
        } catch (idxErr: any) {
          // Graceful fallback if composite index not yet built
          if (typeof idxErr?.message === "string" && idxErr.message.includes("FAILED_PRECONDITION")) {
            currentUsage = 0;
          } else {
            throw idxErr;
          }
        }
      } else {
        const monthlyId = usageMonthlyId(userId, feature, month);
        const monthlySnap = await db.collection(COL_USAGE_MONTHLY).doc(monthlyId).get();
        currentUsage = monthlySnap.exists ? (monthlySnap.data() as any).count || 0 : 0;
      }
      
      const rem = featureRemaining(plan, feature as any, currentUsage);
      const canPerform = rem.unlimited || currentUsage < rem.limit;
      
      return successResponse({
        canUse: canPerform,
        currentUsage,
        limit: rem.limit,
        remaining: rem.remaining,
        plan,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/can-use error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to check feature availability", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_can_use", maxRequests: 100 }
  }
);
