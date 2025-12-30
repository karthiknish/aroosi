import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

const COLL = 'email_builder_presets';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const { id } = await params;
    const snap = await db.collection(COLL).doc(id).collection('versions').orderBy('createdAt', 'desc').limit(50).get();
    const versions = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
    return successResponse({ versions });
  } catch (e) {
    return errorResponse('Failed to list versions', 500);
  }
}
