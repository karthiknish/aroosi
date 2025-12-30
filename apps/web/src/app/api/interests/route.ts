import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  buildInterest,
  COL_INTERESTS,
  interestId,
  buildMatch,
  COL_MATCHES,
  FSInterest,
  deterministicMatchId,
} from "@/lib/firestoreSchema";
import { interestsPostSchema } from "@/lib/validation/apiSchemas/interests";

function normaliseInterestResponseStatus(status: string): "accepted" | "rejected" {
  if (status === "accepted") return "accepted";
  return "rejected";
}

function snapshotUser(user: any) {
  if (!user) return undefined;
  const snap: Record<string, any> = {};
  if (user.fullName != null) snap.fullName = user.fullName;
  if (user.city != null) snap.city = user.city;
  const firstImage = Array.isArray(user.profileImageUrls)
    ? user.profileImageUrls[0]
    : undefined;
  if (firstImage) snap.image = firstImage;
  return Object.keys(snap).length ? snap : undefined;
}

async function loadUser(userId: string) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) };
}

async function ensureMatchIfMutual(fromUserId: string, toUserId: string) {
  const matchDocId = deterministicMatchId(fromUserId, toUserId);
  const existingDoc = await db.collection(COL_MATCHES).doc(matchDocId).get();
  if (existingDoc.exists) return;
  const match = buildMatch(fromUserId, toUserId);
  await db.collection(COL_MATCHES).doc(matchDocId).set(match, { merge: true });
}

async function isBlocked(a: string, b: string) {
  const blockId1 = `${a}_${b}`;
  const blockId2 = `${b}_${a}`;
  const snap1 = await db.collection("blocks").doc(blockId1).get();
  if (snap1.exists) return true;
  const snap2 = await db.collection("blocks").doc(blockId2).get();
  return snap2.exists;
}

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof interestsPostSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const now = Date.now();

    try {
      if (body.action === "send") {
        if (body.toUserId === userId) {
          return errorResponsePublic("Cannot send interest to self", 400);
        }
        if (await isBlocked(userId, body.toUserId)) {
          return errorResponsePublic("Cannot send interest (one of the users is blocked)", 403);
        }
        const docId = interestId(userId, body.toUserId);
        const ref = db.collection(COL_INTERESTS).doc(docId);
        const existing = await ref.get();
        if (existing.exists) {
          return errorResponsePublic("Interest already sent", 409);
        }
        
        // Check inverse direction for existing acceptance
        const inverseId = interestId(body.toUserId, userId);
        const inverseSnap = await db.collection(COL_INTERESTS).doc(inverseId).get();
        if (inverseSnap.exists) {
          const inverse = inverseSnap.data() as FSInterest;
          if (inverse.status === "accepted") {
            await ensureMatchIfMutual(userId, body.toUserId);
            return successResponse({ alreadyMatched: true }, 200, ctx.correlationId);
          }
        }
        
        const fromUser = await loadUser(userId);
        const toUser = await loadUser(body.toUserId);
        const interest = buildInterest({
          fromUserId: userId,
          toUserId: body.toUserId,
          status: "pending",
          fromSnapshot: snapshotUser(fromUser),
          toSnapshot: snapshotUser(toUser),
        });
        await ref.set(interest);
        return successResponse({ interestId: docId }, 200, ctx.correlationId);
        
      } else if (body.action === "respond") {
        const ref = db.collection(COL_INTERESTS).doc(body.interestId);
        const snap = await ref.get();
        if (!snap.exists) {
          return errorResponse("Interest not found", 404, { correlationId: ctx.correlationId });
        }
        const interest = snap.data() as FSInterest;
        if (interest.toUserId !== userId) {
          return errorResponse("Not authorized to respond to this interest", 403, { correlationId: ctx.correlationId });
        }
        if (await isBlocked(interest.fromUserId, interest.toUserId)) {
          return errorResponsePublic("Cannot respond to blocked interest", 403);
        }

        const status = normaliseInterestResponseStatus(String(body.status));
        const updates: Partial<FSInterest> = { status, updatedAt: now };
        await ref.set({ ...interest, ...updates }, { merge: true });
        if (status === "accepted") {
          await ensureMatchIfMutual(interest.fromUserId, interest.toUserId);
        }
        return successResponse({ status }, 200, ctx.correlationId);
        
      } else if (body.action === "remove") {
        const docId = interestId(userId, body.toUserId);
        const ref = db.collection(COL_INTERESTS).doc(docId);
        const snap = await ref.get();
        if (!snap.exists) {
          return successResponse({ alreadyRemoved: true }, 200, ctx.correlationId);
        }
        await ref.delete();
        return successResponse({ removed: 1 }, 200, ctx.correlationId);
      }
      
      return errorResponse("Unsupported action", 400, { correlationId: ctx.correlationId });
    } catch (e: unknown) {
      console.error("interests POST error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to process interest", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: interestsPostSchema,
    rateLimit: { identifier: "interests_write", maxRequests: 30, windowMs: 600000 }
  }
);

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const url = ctx.request.nextUrl;
    const mode = url.searchParams.get("mode") || "sent";
    const otherUserId = url.searchParams.get("userId") || undefined;

    try {
      if (mode === "sent") {
        const snap = await db.collection(COL_INTERESTS).where("fromUserId", "==", userId).get();
        const list = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
        return successResponse(list, 200, ctx.correlationId);
        
      } else if (mode === "received") {
        const snap = await db.collection(COL_INTERESTS).where("toUserId", "==", userId).get();
        const list = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
        return successResponse(list, 200, ctx.correlationId);
        
      } else if (mode === "status") {
        if (!otherUserId) {
          return errorResponse("Missing userId", 400, { correlationId: ctx.correlationId });
        }
        const docId = interestId(userId, otherUserId);
        const snap = await db.collection(COL_INTERESTS).doc(docId).get();
        return successResponse({
          status: snap.exists ? (snap.data() as FSInterest).status : null,
        }, 200, ctx.correlationId);
        
      } else if (mode === "mutual") {
        if (!otherUserId) {
          return errorResponse("Missing userId", 400, { correlationId: ctx.correlationId });
        }
        const a = interestId(userId, otherUserId);
        const b = interestId(otherUserId, userId);
        const [aSnap, bSnap] = await Promise.all([
          db.collection(COL_INTERESTS).doc(a).get(),
          db.collection(COL_INTERESTS).doc(b).get(),
        ]);
        const mutual =
          aSnap.exists &&
          bSnap.exists &&
          ["accepted", "reciprocated"].includes((aSnap.data() as FSInterest).status) &&
          ["accepted", "reciprocated"].includes((bSnap.data() as FSInterest).status);
        return successResponse({ mutual }, 200, ctx.correlationId);
      }
      
      return errorResponse("Invalid mode", 400, { correlationId: ctx.correlationId });
    } catch (e: unknown) {
      console.error("interests GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch interests", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "interests_read", maxRequests: 100 }
  }
);
