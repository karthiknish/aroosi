import { NextRequest } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import { applySecurityHeaders, validateSecurityRequirements } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { imagesProfileUploadSchema } from "@/lib/validation/apiSchemas/imagesProfile";

// GET /api/images/profile?userId=abc - list profile images (ordered) for user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return applySecurityHeaders(errorResponse("Missing userId", 400));
  try {
    // Fetch profile doc (users collection used for profile basics)
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return applySecurityHeaders(successResponse([]));
    const userData = userDoc.data() as any;
    const ids: string[] = Array.isArray(userData.profileImageIds) ? userData.profileImageIds : [];
    // If we stored URLs directly
    const urls: string[] = Array.isArray(userData.profileImageUrls) ? userData.profileImageUrls : [];
    const combined = ids.length ? ids.map((id, i) => ({ id, url: urls[i] || null })) : urls.map((url, i) => ({ id: `${userId}_${i}`, url }));
    return applySecurityHeaders(successResponse(combined));
  } catch (e: any) {
    return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
  }
}

// POST /api/images/profile - add uploaded image metadata to user profile (expects already uploaded to storage via client SDK signed URL)
export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid) return applySecurityHeaders(errorResponse(sec.error || "Invalid request", 400));
  let auth;
  try { auth = await requireAuth(req); } catch (e) { const err = e as AuthError; return applySecurityHeaders(errorResponse(err.message, err.status)); }
  let body: unknown; try { body = await req.json(); } catch { return applySecurityHeaders(errorResponse("Invalid JSON body", 400)); }
  const parsed = imagesProfileUploadSchema.safeParse(body);
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        details: { issues: parsed.error.flatten() },
      })
    );
  const { storageId, fileName, contentType, fileSize } = parsed.data;
  // Basic constraints
  const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (contentType && !ALLOWED.includes(contentType.toLowerCase())) return applySecurityHeaders(errorResponse("Unsupported image type", 400));
  if (fileSize && fileSize > 5 * 1024 * 1024) return applySecurityHeaders(errorResponse("File too large (5MB max)", 400));
  try {
    const userRef = db.collection("users").doc(auth.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return applySecurityHeaders(errorResponse("User not found", 404));
    const data = userSnap.data() as any;
    const ids: string[] = Array.isArray(data.profileImageIds) ? data.profileImageIds : [];
    const urls: string[] = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];
    if (ids.length >= 10) return applySecurityHeaders(errorResponse("Maximum 10 images", 400));
    // Placeholder: we rely on front-end to fetch URL via signed upload; storing storageId; URL retrieval deferred.
    ids.push(storageId);
    // We cannot derive public URL here without a separate signed URL step; leave placeholder null or keep existing length alignment.
    urls.push(urls.length < ids.length ? "" : urls[urls.length - 1]);
    await userRef.set({ profileImageIds: ids, profileImageUrls: urls, updatedAt: Date.now() }, { merge: true });
    return applySecurityHeaders(successResponse({ success: true, imageId: storageId }));
  } catch (e: any) {
    return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
  }
}
