import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";

import type { Icebreaker } from "@aroosi/shared/types";

// Keep internal doc interface but align with shared fields
interface IcebreakerQuestionDoc extends Omit<Icebreaker, "id" | "question"> {
  text: string;
  weight?: number;
  createdAt?: number;
}

function dayKey(ts = nowTimestamp()): string {
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

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    try {
      // Optional auth: answered flag only if authenticated
      const userId = ctx.user ? ((ctx.user as any).userId || (ctx.user as any).id) : null;

      const allSnap = await db
        .collection("icebreakerQuestions")
        .where("active", "==", true)
        .get();
      
      const all: Array<{ id: string; text: string; weight: number }> = [];
      allSnap.forEach((doc: any) => {
        const d = doc.data() as IcebreakerQuestionDoc;
        all.push({
          id: doc.id,
          text: d.text,
          weight: typeof d.weight === "number" && d.weight > 0 ? d.weight : 1,
        });
      });
      
      if (all.length === 0) {
        return successResponse([], 200, ctx.correlationId);
      }

      const key = dayKey();
      const rand = seededRandom(Number.parseInt(key, 10) || nowTimestamp());
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
        return successResponse(
          picked.map((q) => ({ ...q, answered: false })),
          200,
          ctx.correlationId
        );
      }
      
      // Determine answered today
      const now = new Date(nowTimestamp());
      const since = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      const answersSnap = await db
        .collection("userIcebreakerAnswers")
        .where("userId", "==", userId)
        .get();
      
      const answeredMap = new Map<string, string>();
      answersSnap.forEach((doc: any) => {
        const data = doc.data() as any;
        if (data && typeof data.createdAt === "number" && data.createdAt >= since) {
          const qid = String(data.questionId);
          const ans = typeof data.answer === "string" ? data.answer : "";
          answeredMap.set(qid, ans);
        }
      });
      
      return successResponse(
        picked.map((q) => ({
          ...q,
          question: q.text,
          answered: answeredMap.has(q.id),
          answer: answeredMap.get(q.id) || undefined,
        })),
        200,
        ctx.correlationId
      );
    } catch (error) {
      console.error("icebreakers GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch icebreakers", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    requireAuth: false, // Auth optional for icebreakers
    rateLimit: { identifier: "icebreakers_get", maxRequests: 120 }
  }
);
