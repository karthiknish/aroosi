import { NextRequest } from "next/server";
import {
  applySecurityHeaders,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

interface IcebreakerQuestionDoc {
  text: string;
  active?: boolean;
  category?: string;
  weight?: number;
  createdAt?: number;
}

function dayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET(req: NextRequest) {
  const rl = checkApiRateLimit("icebreakers_get", 120, 60_000);
  if (!rl.allowed)
    return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  try {
    // Optional auth: answered flag only if authenticated
    const session = await requireSession(req).catch(() => null);
    const userId =
      session && !("errorResponse" in session) ? session.userId : null;

    const allSnap = await db
      .collection("icebreakerQuestions")
      .where("active", "==", true)
      .get();
    const all: Array<{ id: string; text: string; weight: number }> = [];
    allSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data() as IcebreakerQuestionDoc;
      all.push({
        id: doc.id,
        text: d.text,
        weight: typeof d.weight === "number" && d.weight > 0 ? d.weight : 1,
      });
    });
    if (all.length === 0) return applySecurityHeaders(successResponse([]));

    const key = dayKey();
    const rand = seededRandom(Number.parseInt(key, 10) || Date.now());
    const pickCount = Math.min(3, all.length);
    const pool = [...all];
    const picked: Array<{ id: string; text: string }> = [];
    for (let k = 0; k < pickCount; k++) {
      const totalW = pool.reduce((s, q) => s + q.weight, 0);
      let r = rand() * totalW;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx].weight;
        if (r <= 0) break;
      }
      const chosen = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
      if (chosen) picked.push({ id: chosen.id, text: chosen.text });
    }
    if (!userId) {
      return applySecurityHeaders(
        successResponse(picked.map((q) => ({ ...q, answered: false })))
      );
    }
    // Determine answered today
    const since = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    );
    const answersSnap = await db
      .collection("userIcebreakerAnswers")
      .where("userId", "==", userId)
      .get();
    const answeredSet = new Set<string>();
    answersSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as any;
      if (
        data &&
        typeof data.createdAt === "number" &&
        data.createdAt >= since
      ) {
        answeredSet.add(String(data.questionId));
      }
    });
    return applySecurityHeaders(
      successResponse(
        picked.map((q) => ({ ...q, answered: answeredSet.has(q.id) }))
      )
    );
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
