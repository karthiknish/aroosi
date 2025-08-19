import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const GET = withFirebaseAuth(
  async (user: AuthenticatedUser, req: NextRequest) => {
    // Extract target userId from URL (dynamic segment)
    const url = new URL(req.url);
    const targetUserId = url.pathname.split("/").pop();
    if (!targetUserId) return errorResponse("Missing userId", 400);

    const authedUserId = user.id;

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
      const selfPref =
        (self?.preferredGender as string | undefined) || undefined;
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
      try {
        const [selfQuiz, targetQuiz] = await Promise.all([
          db.collection("userQuizResults").doc(authedUserId).get(),
          db.collection("userQuizResults").doc(targetUserId).get(),
        ]);
        if (selfQuiz.exists && targetQuiz.exists) {
          score += 20;
          reasons.push("quiz");
        }
      } catch {}

      // Lifestyle alignment (diet, smoking, drinking)
      const diet = String(self?.diet || "").toLowerCase();
      const tgtDiet = String(target?.diet || "").toLowerCase();
      if (diet && tgtDiet && diet === tgtDiet) {
        score += 10;
        reasons.push("diet");
      }
      const smoking = String(self?.smoking || "").toLowerCase();
      const tgtSmoking = String(target?.smoking || "").toLowerCase();
      if (smoking && tgtSmoking && smoking === tgtSmoking) {
        score += 10;
        reasons.push("smoking");
      }
      const drinking = String(self?.drinking || "").toLowerCase();
      const tgtDrinking = String(target?.drinking || "").toLowerCase();
      if (drinking && tgtDrinking && drinking === tgtDrinking) {
        score += 10;
        reasons.push("drinking");
      }

      // Clamp score
      if (score > 100) score = 100;

      return successResponse({ score, reasons });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(
        { score: null, reasons: ["error"], error: message },
        500
      );
    }
  }
);
