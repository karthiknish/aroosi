// New consolidated Firebase-based profile images endpoint (optional modern path)
// GET    /api/profile-images/firebase      -> list current user's images
// POST   /api/profile-images/firebase      -> metadata only (after client direct upload) { storageId, fileName, contentType, size }
// DELETE /api/profile-images/firebase?storageId=... -> delete an image owned by user

import { NextRequest } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { adminStorage, db } from "@/lib/firebaseAdmin";

async function listImages(user: AuthenticatedUser) {
  // Resolve bucket defensively: adminStorage.bucket() may throw if no default bucket
  // configured when initializing firebase-admin. Fall back to env-derived bucket.
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
  const [filesRaw] = await bucket.getFiles({
    prefix: `users/${user.id}/profile-images/`,
  });
  const files: any[] = Array.isArray(filesRaw) ? filesRaw : [];
  const images = await Promise.all(
    files
      .filter((f: any) => !f.name.endsWith("/"))
      .map(async (f: any) => {
        const [meta] = await f.getMetadata();
        return {
          url: `https://storage.googleapis.com/${bucket.name || process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${f.name}`,
          storageId: f.name,
          fileName: meta.name,
          size: Number(meta.size || 0),
          uploadedAt: meta.metadata?.uploadedAt || meta.timeCreated,
          contentType: meta.contentType || null,
        };
      })
  );
  return images;
}

export const GET = withFirebaseAuth(async (user: AuthenticatedUser) => {
  try {
    const images = await listImages(user);
    return new Response(JSON.stringify({ success: true, images }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firebase images GET error", e);
    return new Response(JSON.stringify({ success: false, error: "Failed" }), {
      status: 500,
    });
  }
});

export const POST = withFirebaseAuth(
  async (user: AuthenticatedUser, req: NextRequest) => {
    try {
      const body = await req.json().catch(() => ({}));
      const { storageId, fileName, contentType, size } = body as {
        storageId?: string;
        fileName?: string;
        contentType?: string;
        size?: number;
      };
      if (!storageId || !fileName || !contentType || typeof size !== "number") {
        return new Response(
          JSON.stringify({ success: false, error: "Missing fields" }),
          { status: 400 }
        );
      }
      if (!storageId.startsWith(`users/${user.id}/`)) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized storageId" }),
          { status: 403 }
        );
      }
      // Persist metadata to Firestore (simplified subcollection)
      const imagesCol = db
        .collection("users")
        .doc(user.id)
        .collection("images");
      const imageId = storageId.split("/").pop() || storageId;
      // Always derive bucket name from admin SDK where possible, otherwise fall back to env
      let resolvedBucketName: string | undefined;
      try {
        resolvedBucketName = adminStorage.bucket().name;
      } catch (e) {
        resolvedBucketName =
          process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (process.env.GCLOUD_PROJECT
            ? `${process.env.GCLOUD_PROJECT}.appspot.com`
            : undefined);
      }
      const publicUrl = `https://storage.googleapis.com/${resolvedBucketName}/${storageId}`;
      await imagesCol.doc(imageId).set(
        {
          storageId,
          fileName,
          contentType,
          size,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Append to user document arrays (idempotent: avoid duplicates)
      const userRef = db.collection("users").doc(user.id);
      const userSnap = await userRef.get();
      const data = userSnap.exists ? (userSnap.data() as any) : {};
      const existingIds: string[] = Array.isArray(data.profileImageIds)
        ? data.profileImageIds
        : [];
      const existingUrls: string[] = Array.isArray(data.profileImageUrls)
        ? data.profileImageUrls
        : [];

      if (!existingIds.includes(storageId)) {
        existingIds.push(storageId);
        existingUrls.push(publicUrl);
        await userRef.set(
          {
            profileImageIds: existingIds,
            profileImageUrls: existingUrls,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } else {
        // If ID exists but URL missing at same index, repair alignment
        const idx = existingIds.indexOf(storageId);
        if (idx >= 0 && (!existingUrls[idx] || existingUrls[idx] === "")) {
          existingUrls[idx] = publicUrl;
          await userRef.set(
            { profileImageUrls: existingUrls, updatedAt: Date.now() },
            { merge: true }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, imageId, url: publicUrl }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      console.error("firebase images POST error", e);
      return new Response(JSON.stringify({ success: false, error: "Failed" }), {
        status: 500,
      });
    }
  }
);

export const DELETE = withFirebaseAuth(
  async (user: AuthenticatedUser, req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const storageId = searchParams.get("storageId");
      if (!storageId)
        return new Response(
          JSON.stringify({ success: false, error: "Missing storageId" }),
          { status: 400 }
        );
      if (!storageId.startsWith(`users/${user.id}/`)) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 403 }
        );
      }
      let file: any;
      try {
        file = adminStorage.bucket().file(storageId);
      } catch (e) {
        const fallbackName =
          process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (process.env.GCLOUD_PROJECT
            ? `${process.env.GCLOUD_PROJECT}.appspot.com`
            : undefined);
        if (!fallbackName) throw e;
        file = adminStorage.bucket(fallbackName).file(storageId);
      }
      await file.delete({ ignoreNotFound: true });
      const imageId = storageId.split("/").pop() || storageId;
      await db
        .collection("users")
        .doc(user.id)
        .collection("images")
        .doc(imageId)
        .delete()
        .catch(() => {});
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      console.error("firebase images DELETE error", e);
      return new Response(JSON.stringify({ success: false, error: "Failed" }), {
        status: 500,
      });
    }
  }
);
