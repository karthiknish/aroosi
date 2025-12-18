import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_NOTES, buildNote, FSNote } from "@/lib/firestoreSchema";

const noteSchema = z.object({
  toUserId: z.string().min(1),
  note: z.string().max(1000),
});

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    const toUserId = searchParams.get("toUserId");
    
    if (!toUserId) {
      return errorResponse("Missing toUserId", 400, { correlationId: ctx.correlationId });
    }

    try {
      const snap = await db
        .collection(COL_NOTES)
        .where("userId", "==", userId)
        .where("toUserId", "==", toUserId)
        .limit(1)
        .get();
      
      if (snap.empty) {
        return successResponse(null, 200, ctx.correlationId);
      }
      
      const doc = snap.docs[0];
      const data = doc.data() as FSNote;
      return successResponse({ note: data.note, updatedAt: data.updatedAt }, 200, ctx.correlationId);
    } catch (e) {
      console.error("engagement/notes GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch note", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "engagement_notes_get", maxRequests: 60 }
  }
);

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof noteSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { toUserId, note } = body;
    
    if (toUserId === userId) {
      return errorResponse("Cannot set note for self", 400, { correlationId: ctx.correlationId });
    }

    try {
      const existingSnap = await db
        .collection(COL_NOTES)
        .where("userId", "==", userId)
        .where("toUserId", "==", toUserId)
        .limit(1)
        .get();
      
      if (existingSnap.empty) {
        const n = buildNote(userId, toUserId, note);
        await db.collection(COL_NOTES).add(n);
        return successResponse({ created: true }, 200, ctx.correlationId);
      } else {
        const ref = existingSnap.docs[0].ref;
        await ref.set({ note, updatedAt: Date.now() }, { merge: true });
        return successResponse({ updated: true }, 200, ctx.correlationId);
      }
    } catch (e) {
      console.error("engagement/notes POST error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to save note", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: noteSchema,
    rateLimit: { identifier: "engagement_notes_post", maxRequests: 30 }
  }
);
