import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_TYPING_INDICATORS,
  buildTypingIndicator,
} from "@/lib/firestoreSchema";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      return session.errorResponse;
    }
    const { userId } = session;

    // Rate limit typing updates (cheap but potentially noisy)
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token provided
      userId || "unknown",
      "typing_update",
      60000
    );
    if (!rate.allowed) {
      return errorResponse(rate.error || "Rate limit exceeded", 429);
    }

    const { conversationId, action } = await request.json();
    if (!conversationId || !action || !["start", "stop"].includes(action)) {
      return errorResponse("Invalid request parameters", 400);
    }

    // Upsert ephemeral typing indicator (expires after 10s of inactivity)
    const docId = `${conversationId}_${userId}`;
    const indicator = buildTypingIndicator(
      conversationId,
      userId!,
      action === "start"
    );
    await db
      .collection(COL_TYPING_INDICATORS)
      .doc(docId)
      .set(indicator, { merge: true });

    // Emit SSE typing event
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: action === "start" ? "typing_start" : "typing_stop",
        conversationId,
        userId,
        at: Date.now(),
      });
    } catch (eventError) {
      console.warn("Typing SSE emit failed", {
        scope: "typing.update",
        correlationId,
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    return successResponse({
      message: `Typing indicator ${action}ed`,
      indicatorId: docId,
      conversationId,
      userId,
      action,
      isTyping: action === "start",
      correlationId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Error handling typing indicator:", error);
    return errorResponse("Failed to update typing indicator", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      return session.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return errorResponse("Missing conversationId", 400);

    const cutoff = Date.now() - 10000; // 10s window
    const snap = await db
      .collection(COL_TYPING_INDICATORS)
      .where("conversationId", "==", conversationId)
      .where("updatedAt", ">=", cutoff)
      .get();
    const typingUsers = snap.docs
      .map(
        (
          d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => d.data() as any
      )
      .filter((d: any) => d.isTyping)
      .map((d: any) => d.userId);

    return successResponse({
      conversationId,
      typingUsers,
    });
  } catch (error) {
    console.error("Error fetching typing indicators:", error);
    return errorResponse("Failed to fetch typing indicators", 500);
  }
}
