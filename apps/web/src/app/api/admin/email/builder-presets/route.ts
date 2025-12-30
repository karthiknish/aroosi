import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

const COLL = 'email_builder_presets';

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const snap = await db.collection(COLL).orderBy('updatedAt', 'desc').limit(50).get();
    const presets = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
    return successResponse({ presets });
  } catch (e) {
    return errorResponse('Failed to list presets', 500);
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const schema = body?.schema;
    if (!name || !schema || typeof schema !== 'object') return errorResponse('Invalid payload', 400);
    const now = Date.now();
    const doc = await db.collection(COLL).add({ name, schema, createdAt: now, updatedAt: now });
    return successResponse({ id: doc.id });
  } catch (e) {
    return errorResponse('Failed to save preset', 500);
  }
}


