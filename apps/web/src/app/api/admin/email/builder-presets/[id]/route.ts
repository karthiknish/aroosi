import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

const COLL = 'email_builder_presets';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updates: any = { updatedAt: nowTimestamp() };
    if (typeof body?.name === 'string') updates.name = String(body.name).trim();
    if (body?.schema && typeof body.schema === 'object') {
      updates.schema = body.schema;
      // create a new version document capturing previous state for history
      try {
        const current = await db.collection(COLL).doc(id).get();
        if (current.exists) {
          const cur = current.data() as any;
          const versionDoc = {
            createdAt: nowTimestamp(),
            name: cur?.name,
            schema: cur?.schema,
            updatedAt: cur?.updatedAt,
          };
          await db.collection(COLL).doc(id).collection('versions').add(versionDoc);
        }
      } catch {}
    }
    if (Object.keys(updates).length === 1) return errorResponse('No updates', 400);
    await db.collection(COLL).doc(id).set(updates, { merge: true });
    return successResponse({ ok: true });
  } catch (e) {
    return errorResponse('Failed to update preset', 500);
  }
}

// List versions for a preset
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const { id } = await params;
    const snap = await db.collection(COLL).doc(id).collection('versions').orderBy('createdAt', 'desc').limit(25).get();
    const versions = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
    return successResponse({ versions });
  } catch (e) {
    return errorResponse('Failed to list versions', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const { id } = await params;
    await db.collection(COLL).doc(id).delete();
    return successResponse({ ok: true });
  } catch (e) {
    return errorResponse('Failed to delete preset', 500);
  }
}


