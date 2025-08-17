import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { COL_NOTES, buildNote, FSNote } from "@/lib/firestoreSchema";

const setSchema = z.object({
  toUserId: z.string().min(1),
  note: z.string().max(1000),
});

export async function GET(req: NextRequest) {
  const toUserId = req.nextUrl.searchParams.get("toUserId");
  if (!toUserId)
    return applySecurityHeaders(errorResponse("Missing toUserId", 400));
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    const err = e as AuthError;
    return applySecurityHeaders(errorResponse(err.message, err.status));
  }
  try {
    const snap = await db
      .collection(COL_NOTES)
      .where("userId", "==", auth.userId)
      .where("toUserId", "==", toUserId)
      .limit(1)
      .get();
    if (snap.empty) return applySecurityHeaders(successResponse(null));
    const doc = snap.docs[0];
    const data = doc.data() as FSNote;
    return applySecurityHeaders(
      successResponse({ note: data.note, updatedAt: data.updatedAt })
    );
  } catch (e: unknown) {
    return applySecurityHeaders(
      errorResponse(e instanceof Error ? e.message : String(e), 500)
    );
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
  const parsed = setSchema.safeParse(body);
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
      })
    );
  const { toUserId, note } = parsed.data;
  if (toUserId === auth.userId)
    return applySecurityHeaders(errorResponse("Cannot set note for self", 400));
  try {
    const existingSnap = await db
      .collection(COL_NOTES)
      .where("userId", "==", auth.userId)
      .where("toUserId", "==", toUserId)
      .limit(1)
      .get();
    if (existingSnap.empty) {
      const n = buildNote(auth.userId, toUserId, note);
      await db.collection(COL_NOTES).add(n);
      return applySecurityHeaders(
        successResponse({ success: true, created: true })
      );
    } else {
      const ref = existingSnap.docs[0].ref;
      await ref.set({ note, updatedAt: Date.now() }, { merge: true });
      return applySecurityHeaders(
        successResponse({ success: true, updated: true })
      );
    }
  } catch (e: unknown) {
    return applySecurityHeaders(
      errorResponse(e instanceof Error ? e.message : String(e), 500)
    );
  }
}
