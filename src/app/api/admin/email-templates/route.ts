import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

// Email template schema
// { id, name, description?, subject, html?, text?, variablesSchema?, createdBy, createdAt, updatedAt, lastUsedAt? }

export async function GET(request: NextRequest) {
  const { role } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  const snap = await db.collection("emailTemplates").orderBy("createdAt", "desc").get();
  const items = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
  return successResponse({ items });
}

export async function POST(request: NextRequest) {
  const { role, userId, email } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, description, subject, html, text, variablesSchema } = body || {};
  if (!name || !subject) {
    return errorResponse("name and subject are required", 400, { fields: ["name", "subject"] });
  }
  if (!html && !text) {
    return errorResponse("Provide html or text content", 400);
  }
  const now = Date.now();
  const docRef = db.collection("emailTemplates").doc();
  await docRef.set({
    name: String(name),
    description: description ? String(description) : undefined,
    subject: String(subject),
    html: html ? String(html) : undefined,
    text: text ? String(text) : undefined,
    variablesSchema: variablesSchema && typeof variablesSchema === "object" ? variablesSchema : undefined,
    createdBy: userId || email || "admin",
    createdAt: now,
    updatedAt: now,
  });
  const doc = await docRef.get();
  return successResponse({ id: docRef.id, ...(doc.data() as any) });
}
