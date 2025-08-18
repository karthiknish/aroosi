import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(
  req: NextRequest,
  context:
    | { params: { userId: string } }
    | { params: Promise<{ userId: string }> }
) {
  // Next.js 15 may provide params as a Promise; normalize by awaiting.
  // (Covers both sync and async forms.)
  const { userId: targetUserId } = await (context as any).params;
  if (!targetUserId) return errorResponse("Missing userId", 400);
  let authedUserId: string;
  try {
    const auth = await requireAuth(req);
    authedUserId = auth.userId;
  } catch (e) {
    const err = e as AuthError;
    return errorResponse(
      { score: null, reasons: ["unauthenticated"], error: err?.message },
      401
    );
  }

  try {
    // Load self & target user docs (profile fields flattened in users doc)
    const [selfSnap, targetSnap] = await Promise.all([
      db.collection("users").doc(authedUserId).get(),
      db.collection("users").doc(targetUserId).get(),
    ]);
    if (!targetSnap.exists) {
      return successResponse({ score: null, reasons: ["no-target-profile"] });
    }
    if (!selfSnap.exists) {
      return successResponse({ score: null, reasons: ["no-self"] });
    }
    const self = selfSnap.data() as any;
    const target = targetSnap.data() as any;

    let score = 0;
    const reasons: string[] = [];

    // City match
    if (
      self?.city &&
      target?.city &&
      String(self.city).toLowerCase() === String(target.city).toLowerCase()
    ) {
      score += 20;
      reasons.push("city");
    }

    // Preferred gender (self preference applies to target's gender)
    const selfPref = (self?.preferredGender as string | undefined) || undefined;
    const tgtGender = (target?.gender as string | undefined) || undefined;
    if (
      !selfPref ||
      selfPref === "any" ||
      (tgtGender && selfPref === tgtGender)
    ) {
      score += 20;
      reasons.push("gender");
    }

    // Age window (self preferences vs target DOB)
    const min = Number(self?.partnerPreferenceAgeMin ?? NaN);
    const max = Number(self?.partnerPreferenceAgeMax ?? NaN);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      const dobStr = target?.dateOfBirth as string | undefined;
      const year = dobStr ? parseInt(dobStr.slice(0, 4)) : NaN;
      const nowYear = new Date().getUTCFullYear();
      const age = nowYear - (Number.isFinite(year) ? year : nowYear);
      if (age >= min && age <= max) {
        score += 20;
        reasons.push("age");
      }
    }

    // Quiz similarity placeholder: existence of userQuizResults docs for both
    const [selfQuiz, targetQuiz] = await Promise.all([
      db
        .collection("userQuizResults")
        .where("userId", "==", authedUserId)
        .limit(1)
        .get(),
      db
        .collection("userQuizResults")
        .where("userId", "==", targetUserId)
        .limit(1)
        .get(),
    ]);
    if (!selfQuiz.empty && !targetQuiz.empty) {
      score += 20;
      reasons.push("quiz");
    }

    // Completeness: aboutMe + at least one image
    if (
      target?.aboutMe &&
      Array.isArray(target?.profileImageUrls) &&
      target.profileImageUrls.length > 0
    ) {
      score += 20;
      reasons.push("completeness");
    }

    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return successResponse({ score, reasons });
  } catch (e) {
    return errorResponse("Failed to compute compatibility", 500);
  }
}
