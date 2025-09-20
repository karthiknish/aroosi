// New consolidated Firebase-based profile images endpoint (optional modern path)
// GET    /api/profile-images/firebase      -> list current user's images
// POST   /api/profile-images/firebase      -> metadata only (after client direct upload) { storageId, fileName, contentType, size }
// DELETE /api/profile-images/firebase?storageId=... -> delete an image owned by user

import { NextRequest } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { adminStorage, db } from "@/lib/firebaseAdmin";

async function listImages(userId: string) {
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
    prefix: `users/${userId}/profile-images/`,
  });
  const files: any[] = Array.isArray(filesRaw) ? filesRaw : [];
  const images = await Promise.all(
    files
      .filter((f: any) => !f.name.endsWith("/"))
      .map(async (f: any) => {
        const [meta] = await f.getMetadata();
        // Use public URL since storage rules allow public read access
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${f.name}`;
        return {
          url: publicUrl,
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

export const GET = withFirebaseAuth(
  async (user: AuthenticatedUser, req?: NextRequest) => {
    try {
      let targetUserId = user.id;
      try {
        if (req) {
          const sp = new URL(req.url).searchParams;
          const qsUserId = sp.get("userId");
          if (qsUserId && (qsUserId === user.id || user.role === "admin")) {
            targetUserId = qsUserId;
          }
        }
      } catch {}
      const images = await listImages(targetUserId);
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
  }
);

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
      // Use public URL since storage rules allow public read access
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageId}`;

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
        existingUrls.push(signedUrl);
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
          existingUrls[idx] = signedUrl;
          await userRef.set(
            { profileImageUrls: existingUrls, updatedAt: Date.now() },
            { merge: true }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, imageId, url: signedUrl }),
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
      // Remove image doc
      await db
        .collection("users")
        .doc(user.id)
        .collection("images")
        .doc(imageId)
        .delete()
        .catch(() => {});
      // Also remove from arrays on user doc to keep UI consistent
      const userRef = db.collection("users").doc(user.id);
      const snap = await userRef.get();
      if (snap.exists) {
        const data = snap.data() as any;
        const ids: string[] = Array.isArray(data.profileImageIds)
          ? data.profileImageIds.slice()
          : [];
        const urls: string[] = Array.isArray(data.profileImageUrls)
          ? data.profileImageUrls.slice()
          : [];
        const idx = ids.findIndex(
          (id) => id === storageId || id.endsWith(`/${imageId}`)
        );
        if (idx >= 0) {
          ids.splice(idx, 1);
          if (urls[idx]) urls.splice(idx, 1);
          await userRef.set(
            {
              profileImageIds: ids,
              profileImageUrls: urls,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        }
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      console.error("firebase images DELETE error", e);
      return new Response(JSON.stringify({ success: false, error: "Failed" }), {
        status: 500,
      });
    }
  }
);
