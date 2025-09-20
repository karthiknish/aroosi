// Firebase migration: this route now delegates to Firebase Storage/Firestore.
// It remains at /api/profile-images for backward compatibility while clients
// are updated to use /api/profile-images/firebase. Convex dependencies removed.
// Supported operations:
//  GET    /api/profile-images               -> list current user's images
//  POST   /api/profile-images               -> save image metadata (after direct upload)
//  DELETE /api/profile-images (JSON body)   -> { storageId } deletes image
// Legacy fields (fileSize) are mapped to `size`.

import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { adminStorage, db } from "@/lib/firebaseAdmin";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_USER = 5;

async function listUserImages(user: AuthenticatedUser) {
  let bucket: any;
  try {
    bucket = adminStorage.bucket();
  } catch (e) {
    const fallback =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.appspot.com`
        : undefined);
    if (!fallback) throw e;
    bucket = adminStorage.bucket(fallback);
  }
  const [filesRaw] = await bucket.getFiles({
    prefix: `users/${user.id}/profile-images/`,
  });
  const files: any[] = Array.isArray(filesRaw) ? filesRaw : [];
  return Promise.all(
    files
      .filter((f: any) => !f.name.endsWith("/"))
      .map(async (f: any) => {
        const [meta] = await f.getMetadata();
        // Generate signed URL for secure access
        const [signedUrl] = await f.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        return {
          storageId: f.name,
          fileName: meta.name,
          url: signedUrl,
          size: Number(meta.size || 0),
          uploadedAt: meta.metadata?.uploadedAt || meta.timeCreated,
          contentType: meta.contentType || null,
        };
      })
  );
}

export const GET = withFirebaseAuth(async (user) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const images = await listUserImages(user);
    return new Response(
      JSON.stringify({ success: true, images, correlationId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("profile-images GET firebase error", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch images",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const body = await req.json().catch(() => ({}));
    const { storageId, fileName, contentType } = body as Record<
      string,
      unknown
    >;
    const size = (body as any).size ?? (body as any).fileSize; // legacy support
    if (!storageId || !fileName || !contentType || typeof size !== "number") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!String(storageId).startsWith(`users/${user.id}/`)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized storage path",
          correlationId,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!ALLOWED_TYPES.includes(String(contentType).toLowerCase() as any)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unsupported image type",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (size > MAX_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "File too large",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Enforce max images (Firestore count + storage listing best-effort)
    try {
      const existing = await listUserImages(user);
      if (existing.length >= MAX_IMAGES_PER_USER) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `You can only display up to ${MAX_IMAGES_PER_USER} images`,
            correlationId,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch {}

    const imageId = String(storageId).split("/").pop() || String(storageId);
    // Generate signed URL for the image
    let bucket: any;
    try {
      bucket = adminStorage.bucket();
    } catch (e) {
      const fallbackName =
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        (process.env.GCLOUD_PROJECT
          ? `${process.env.GCLOUD_PROJECT}.appspot.com`
          : undefined);
      if (!fallbackName) throw e;
      bucket = adminStorage.bucket(fallbackName);
    }
    const file = bucket.file(storageId);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    await db
      .collection("users")
      .doc(user.id)
      .collection("images")
      .doc(imageId)
      .set(
        {
          storageId,
          fileName,
          contentType,
          size,
          url: signedUrl,
          uploadedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    return new Response(
      JSON.stringify({ success: true, imageId, correlationId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("profile-images POST firebase error", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to save metadata",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const DELETE = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    let storageId: string | null = null;
    // Prefer JSON body
    try {
      const body = await req.json();
      storageId = body?.storageId || body?.imageId || null; // legacy imageId
    } catch {}
    if (!storageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing storageId",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!storageId.startsWith(`users/${user.id}/`)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          correlationId,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    let fileRef: any;
    try {
      fileRef = adminStorage.bucket().file(storageId);
    } catch (e) {
      const fallback =
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        (process.env.GCLOUD_PROJECT
          ? `${process.env.GCLOUD_PROJECT}.appspot.com`
          : undefined);
      if (!fallback) throw e;
      fileRef = adminStorage.bucket(fallback).file(storageId);
    }
    await fileRef.delete({ ignoreNotFound: true }).catch(() => {});
    const imageId = storageId.split("/").pop() || storageId;
    await db
      .collection("users")
      .doc(user.id)
      .collection("images")
      .doc(imageId)
      .delete()
      .catch(() => {});
    return new Response(JSON.stringify({ success: true, correlationId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("profile-images DELETE firebase error", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to delete image",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// NOTE: Admin cross-user image management previously supported via Convex by
// passing an arbitrary userId. That functionality will be reintroduced via
// dedicated admin endpoints (e.g. /api/admin/profiles/[id]/images/*) if still
// required. This legacy route now only acts on the authenticated user's images.
