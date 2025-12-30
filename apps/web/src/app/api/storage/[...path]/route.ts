import {
  createApiHandler,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { Readable } from "node:stream";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    const { request, nextCtx } = ctx;
    const start = nowTimestamp();
    
    // nextCtx contains params
    const params = await nextCtx?.params;
    const segments = params?.path || [];

    if (!segments.length) {
      return errorResponse("Missing path", 400, { correlationId: ctx.correlationId });
    }
    
    // Reconstruct storage path
    const storagePath = segments.join("/");
    try {
      // Security: only allow expected folders
      const allowedPrefix =
        storagePath.startsWith("users/") || storagePath.startsWith("profileImages/");
      if (!allowedPrefix || storagePath.includes("..")) {
        return errorResponse("Invalid path", 400, { correlationId: ctx.correlationId });
      }

      // Some environments store legacy profile images under `profileImages/` and/or
      // use a `.firebasestorage.app` bucket instead of `.appspot.com`.
      // We try a few bucket candidates and pick the first one where the object exists.
      const candidates = new Set<string>();
      const projectId = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const envBucket =
        process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (envBucket) candidates.add(envBucket);
      if (projectId) {
        candidates.add(`${projectId}.appspot.com`);
        candidates.add(`${projectId}.firebasestorage.app`);
      }

      // If a default bucket exists, try it first.
      let defaultBucket: any | null = null;
      try {
        defaultBucket = adminStorage.bucket();
        if (defaultBucket?.name) candidates.add(String(defaultBucket.name));
      } catch {}

      const bucketNames = Array.from(candidates);
      const bucketsToTry = [] as any[];
      if (defaultBucket) bucketsToTry.push(defaultBucket);
      for (const name of bucketNames) {
        try {
          // Skip duplicate default bucket
          if (defaultBucket?.name && String(defaultBucket.name) === name) continue;
          bucketsToTry.push(adminStorage.bucket(name));
        } catch {}
      }

      let bucket: any | null = null;
      let file: any | null = null;
      for (const b of bucketsToTry) {
        try {
          const f = b.file(storagePath);
          const [exists] = await f.exists();
          if (exists) {
            bucket = b;
            file = f;
            break;
          }
        } catch {}
      }

      if (!bucket || !file) {
        return errorResponse("Not found", 404, { correlationId: ctx.correlationId });
      }
      const isProfileImage =
        (storagePath.startsWith("users/") && storagePath.includes("profile-images")) ||
        storagePath.startsWith("profileImages/");

      // For profile images, stream bytes directly so Next.js (next/image) can
      // validate and optimize the image (it can fail on 302-with-empty-body).
      if (isProfileImage) {
        const [meta] = await file.getMetadata().catch(() => [null as any]);
        const contentType =
          (meta && typeof meta.contentType === "string" && meta.contentType) ||
          "application/octet-stream";

        const nodeStream = file.createReadStream();
        // Convert Node.js Readable -> WHATWG ReadableStream
        const webStream = Readable.toWeb(nodeStream as any) as unknown as ReadableStream;

        return new Response(webStream, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            // Cache fairly aggressively; images are immutable by filename in this app.
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "X-Proxy-Time": `${Date.now() - start}ms`,
            "X-Storage-Bucket": String(bucket.name || ""),
          },
        });
      }

      // For other objects, keep redirect behavior (cheaper than streaming).
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: nowTimestamp() + 60 * 60 * 1000,
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: signedUrl,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          "X-Proxy-Time": `${Date.now() - start}ms`,
          "X-Storage-Bucket": String(bucket.name || ""),
        },
      });
    } catch (e: any) {
      // Development fallback: if Firebase Admin fails, try to construct a public URL directly
      if (
        process.env.NODE_ENV === "development" &&
        (storagePath.includes("profile-images") || storagePath.startsWith("profileImages/"))
      ) {
        // Best-effort: redirect to a public URL when admin SDK is unavailable.
        const url = `https://storage.googleapis.com/aroosi-project.appspot.com/${storagePath}`;
        return new Response(null, {
          status: 302,
          headers: {
            Location: url,
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
            "X-Proxy-Time": `${Date.now() - start}ms`,
            "X-Development-Fallback": "true",
          },
        });
      }
      console.error("/api/storage error", e);
      return errorResponse(e?.message || "Failed", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    validateSecurity: false, // Public endpoint
    rateLimit: { identifier: "storage_get", maxRequests: 200 }
  }
);

