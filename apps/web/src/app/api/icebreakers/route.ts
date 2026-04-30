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
  category?: string;
  weight?: number;
  createdAt?: number;
}

interface IcebreakerAnswerDoc {
  questionId?: string;
  answer?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
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
      const url = new URL(ctx.request.url);
      // Optional auth: answered flag only if authenticated
      const userId = ctx.user ? ((ctx.user as any).userId || (ctx.user as any).id) : null;
      const requestedUserId = url.searchParams.get("userId")?.trim() || null;
      const answersOnly = url.searchParams.get("answersOnly") === "true";
      const requestedCategory = url.searchParams.get("category")?.trim().toLowerCase() || null;

      if (requestedUserId || answersOnly) {
        const targetUserId = requestedUserId || userId;

        if (!targetUserId) {
          return successResponse([], 200, ctx.correlationId);
        }

        const answersSnap = await db
          .collection("userIcebreakerAnswers")
          .where("userId", "==", targetUserId)
          .get();

        const rawAnswers = answersSnap.docs
          .map((doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
            const data = doc.data() as IcebreakerAnswerDoc;
            const questionId = typeof data.questionId === "string" ? data.questionId : "";
            const answer = typeof data.answer === "string" ? data.answer.trim() : "";
            const rawCreatedAt = data.updatedAt ?? data.createdAt ?? nowTimestamp();
            const createdAt =
              typeof rawCreatedAt === "number"
                ? new Date(rawCreatedAt).toISOString()
                : String(rawCreatedAt);

            return {
              id: doc.id,
              questionId,
              answer,
              createdAt,
            };
          })
          .filter((answer) => answer.questionId && answer.answer);

        if (rawAnswers.length === 0) {
          return successResponse([], 200, ctx.correlationId);
        }

        const questionTextById = new Map<string, string>();
        const questionIds = [...new Set(rawAnswers.map((answer) => answer.questionId))];
        const questionDocs = await Promise.all(
          questionIds.map((questionId) => db.collection("icebreakerQuestions").doc(questionId).get())
        );

        questionDocs.forEach((questionDoc) => {
          if (!questionDoc.exists) {
            return;
          }

          const questionData = questionDoc.data() as IcebreakerQuestionDoc;
          questionTextById.set(questionDoc.id, questionData.text || "");
        });

        return successResponse(
          rawAnswers.map((answer) => ({
            id: answer.id,
            icebreakerRef: answer.questionId,
            questionId: answer.questionId,
            question: questionTextById.get(answer.questionId) || "",
            answer: answer.answer,
            userId: targetUserId,
            createdAt: answer.createdAt,
            answeredAt: answer.createdAt,
          })),
          200,
          ctx.correlationId
        );
      }

      const allSnap = await db
        .collection("icebreakerQuestions")
        .where("active", "==", true)
        .get();
      
      const all: Array<{ id: string; text: string; category?: string; weight: number }> = [];
      allSnap.forEach((doc: any) => {
        const d = doc.data() as IcebreakerQuestionDoc;
        all.push({
          id: doc.id,
          text: d.text,
          category: typeof d.category === "string" ? d.category : undefined,
          weight: typeof d.weight === "number" && d.weight > 0 ? d.weight : 1,
        });
      });
      
      if (all.length === 0) {
        return successResponse([], 200, ctx.correlationId);
      }

      if (requestedCategory) {
        const questions = all
          .filter((question) => question.category?.toLowerCase() === requestedCategory)
          .map((question) => ({
            id: question.id,
            text: question.text,
            question: question.text,
            category: question.category || requestedCategory,
            answered: false,
          }));

        return successResponse(questions, 200, ctx.correlationId);
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
