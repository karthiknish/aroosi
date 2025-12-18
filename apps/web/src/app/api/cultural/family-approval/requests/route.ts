import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { FamilyApprovalRequest } from "@/types/cultural";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      const requestsSnapshot = await db
        .collection("familyApprovalRequests")
        .where("requesterId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      const requests: FamilyApprovalRequest[] = [];
      requestsSnapshot.forEach((doc: any) => {
        requests.push({ _id: doc.id, ...doc.data() } as FamilyApprovalRequest);
      });

      return successResponse({ requests }, 200, ctx.correlationId);
    } catch (error) {
      console.error("cultural/family-approval/requests error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch requests", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "family_approval_requests", maxRequests: 100 }
  }
);
