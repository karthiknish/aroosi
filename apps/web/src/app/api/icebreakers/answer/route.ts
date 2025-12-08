import { NextRequest } from "next/server";
import { z } from "zod";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";
import { FieldValue } from "firebase-admin/firestore";

const AnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );
  const rl = checkApiRateLimit("icebreakers_answer", 50, 60_000);
  if (!rl.allowed)
    return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  const session = await requireSession(req);
  if ("errorResponse" in session)
    return applySecurityHeaders(errorResponse("Unauthorized", 401));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
      })
    );
  }
  try {
    const { questionId, answer } = parsed.data;
    // Ensure question exists and active
    const qDoc = await db
      .collection("icebreakerQuestions")
      .doc(questionId)
      .get();
    if (!qDoc.exists || qDoc.data()?.active === false) {
      return applySecurityHeaders(errorResponse("Invalid question", 400));
    }
    const val = String(answer).trim();
    if (val.length === 0)
      return applySecurityHeaders(errorResponse("Answer cannot be empty", 400));
    const existingSnap = await db
      .collection("userIcebreakerAnswers")
      .where("userId", "==", session.userId)
      .where("questionId", "==", questionId)
      .get();
    const now = Date.now();
    if (!existingSnap.empty) {
      // Update existing answer (do not increment count)
      const docRef = existingSnap.docs[0].ref;
      await docRef.set(
        { userId: session.userId, questionId, answer: val, createdAt: now },
        { merge: true }
      );
      return applySecurityHeaders(
        successResponse({ success: true, updated: true })
      );
    }
    // New answer: create and increment answeredIcebreakersCount on user profile
    await db
      .collection("userIcebreakerAnswers")
      .add({ userId: session.userId, questionId, answer: val, createdAt: now });
    try {
      const userRef = db.collection("users").doc(String(session.userId));
      await userRef.set(
        { answeredIcebreakersCount: FieldValue.increment(1) },
        { merge: true }
      );
      // Fire-and-forget analytics record
      try {
        await db.collection(COL_USAGE_EVENTS).add({
          userId: session.userId,
          feature: "icebreaker_answered",
          createdAt: now,
          context: { questionId },
        });
      } catch (evtErr) {
        console.warn("Failed to record icebreaker_answered event", evtErr);
      }
    } catch (incErr) {
      console.warn("Failed to increment answeredIcebreakersCount", incErr);
    }
    return applySecurityHeaders(
      successResponse({ success: true, created: true, incremented: true })
    );
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
