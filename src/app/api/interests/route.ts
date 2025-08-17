import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import {
  buildInterest,
  COL_INTERESTS,
  interestId,
  buildMatch,
  COL_MATCHES,
  FSInterest,
} from "@/lib/firestoreSchema";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
} from "@/lib/utils/securityHeaders";

const sendSchema = z.object({
  action: z.literal("send"),
  toUserId: z.string().min(1),
});
const respondSchema = z.object({
  action: z.literal("respond"),
  interestId: z.string().min(1),
  status: z.enum(["accepted", "rejected"]),
});
const removeSchema = z.object({
  action: z.literal("remove"),
  toUserId: z.string().min(1),
});
const PostSchema = z.discriminatedUnion("action", [
  sendSchema,
  respondSchema,
  removeSchema,
]);

function snapshotUser(user: any) {
  if (!user) return undefined;
  return {
    fullName: user.fullName,
    city: user.city,
    image: user.profileImageUrls?.[0],
  };
}
async function loadUser(userId: string) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) };
}
async function ensureMatchIfMutual(fromUserId: string, toUserId: string) {
  const reciprocalId = interestId(toUserId, fromUserId);
  const reciprocalSnap = await db
    .collection(COL_INTERESTS)
    .doc(reciprocalId)
    .get();
  const reciprocal = reciprocalSnap.exists
    ? (reciprocalSnap.data() as FSInterest)
    : null;
  if (reciprocal && ["accepted", "reciprocated"].includes(reciprocal.status)) {
    const existing = await db
      .collection(COL_MATCHES)
      .where("user1Id", "in", [fromUserId, toUserId])
      .where("user2Id", "in", [fromUserId, toUserId])
      .limit(1)
      .get();
    if (existing.empty) {
      const match = buildMatch(fromUserId, toUserId);
      await db.collection(COL_MATCHES).add(match);
    }
  }
}

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    const err = e as AuthError;
    return applySecurityHeaders(errorResponse(err.message, err.status));
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
      })
    );
  const data = parsed.data;
  const now = Date.now();
  try {
    if (data.action === "send") {
      if (data.toUserId === auth.userId)
        return applySecurityHeaders(
          errorResponse("Cannot send interest to self", 400)
        );
      const docId = interestId(auth.userId, data.toUserId);
      const ref = db.collection(COL_INTERESTS).doc(docId);
      const existing = await ref.get();
      if (existing.exists)
        return applySecurityHeaders(
          successResponse({ success: false, error: "Interest already sent" })
        );
      const fromUser = await loadUser(auth.userId);
      const toUser = await loadUser(data.toUserId);
      const interest = buildInterest({
        fromUserId: auth.userId,
        toUserId: data.toUserId,
        status: "pending",
        fromSnapshot: snapshotUser(fromUser),
        toSnapshot: snapshotUser(toUser),
      });
      await ref.set(interest);
      return applySecurityHeaders(
        successResponse({ success: true, interestId: docId })
      );
    } else if (data.action === "respond") {
      const ref = db.collection(COL_INTERESTS).doc(data.interestId);
      const snap = await ref.get();
      if (!snap.exists)
        return applySecurityHeaders(errorResponse("Interest not found", 404));
      const interest = snap.data() as FSInterest;
      if (interest.toUserId !== auth.userId)
        return applySecurityHeaders(
          errorResponse("Not authorized to respond to this interest", 403)
        );
      const updates: Partial<FSInterest> = {
        status: data.status,
        updatedAt: now,
      };
      await ref.set({ ...interest, ...updates }, { merge: true });
      if (data.status === "accepted")
        await ensureMatchIfMutual(interest.fromUserId, interest.toUserId);
      return applySecurityHeaders(
        successResponse({ success: true, status: data.status })
      );
    } else if (data.action === "remove") {
      const docId = interestId(auth.userId, data.toUserId);
      const ref = db.collection(COL_INTERESTS).doc(docId);
      const snap = await ref.get();
      if (!snap.exists)
        return applySecurityHeaders(
          successResponse({ success: true, alreadyRemoved: true })
        );
      await ref.delete();
      return applySecurityHeaders(
        successResponse({ success: true, removed: 1 })
      );
    }
    return applySecurityHeaders(errorResponse("Unsupported action", 400));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(errorResponse(msg, 500));
  }
}

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    const err = e as AuthError;
    return applySecurityHeaders(errorResponse(err.message, err.status));
  }
  const url = req.nextUrl;
  const mode = url.searchParams.get("mode") || "sent";
  const otherUserId = url.searchParams.get("userId") || undefined;
  try {
    if (mode === "sent") {
      const snap = await db
        .collection(COL_INTERESTS)
        .where("fromUserId", "==", auth.userId)
        .get();
      const list = snap.docs.map(
        (
          d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => ({ id: d.id, ...(d.data() as any) })
      );
      return applySecurityHeaders(successResponse(list));
    } else if (mode === "received") {
      const snap = await db
        .collection(COL_INTERESTS)
        .where("toUserId", "==", auth.userId)
        .get();
      const list = snap.docs.map(
        (
          d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => ({ id: d.id, ...(d.data() as any) })
      );
      return applySecurityHeaders(successResponse(list));
    } else if (mode === "status") {
      if (!otherUserId)
        return applySecurityHeaders(errorResponse("Missing userId", 400));
      const docId = interestId(auth.userId, otherUserId);
      const snap = await db.collection(COL_INTERESTS).doc(docId).get();
      return applySecurityHeaders(
        successResponse({
          status: snap.exists ? (snap.data() as FSInterest).status : null,
        })
      );
    } else if (mode === "mutual") {
      if (!otherUserId)
        return applySecurityHeaders(errorResponse("Missing userId", 400));
      const a = interestId(auth.userId, otherUserId);
      const b = interestId(otherUserId, auth.userId);
      const [aSnap, bSnap] = await Promise.all([
        db.collection(COL_INTERESTS).doc(a).get(),
        db.collection(COL_INTERESTS).doc(b).get(),
      ]);
      const mutual =
        aSnap.exists &&
        bSnap.exists &&
        ["accepted", "reciprocated"].includes(
          (aSnap.data() as FSInterest).status
        ) &&
        ["accepted", "reciprocated"].includes(
          (bSnap.data() as FSInterest).status
        );
      return applySecurityHeaders(successResponse({ mutual }));
    }
    return applySecurityHeaders(errorResponse("Invalid mode", 400));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(errorResponse(msg, 500));
  }
}
