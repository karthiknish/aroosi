import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";

type UsageHistoryItem = { feature: string; timestamp: number };

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (e) {
    const err = e as AuthError;
    return errorResponse(err.message, (err as AuthError).status || 401, {
      code: (err as AuthError).code,
    });
  }
  try {
    const url = new URL(request.url);
    const days = Math.max(
      1,
      Math.min(30, Number(url.searchParams.get("days") || 7))
    );
    const limit = Math.max(
      1,
      Math.min(1000, Number(url.searchParams.get("limit") || 200))
    );
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const snap = await db
      .collection(COL_USAGE_EVENTS)
      .where("userId", "==", auth.userId)
      .where("timestamp", ">=", cutoff)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const items: UsageHistoryItem[] = snap.docs.map(
      (
        d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => {
        const data = d.data() as any;
        return {
          feature: String(data.feature || "unknown"),
          timestamp: Number(data.timestamp || Date.now()),
        };
      }
    );
    return successResponse<UsageHistoryItem[]>(items);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("/api/subscription/usage-history failure", {
      message: msg,
      error,
    });
    return errorResponse("Failed to fetch usage history", 500, {
      details: msg,
    });
  }
}
