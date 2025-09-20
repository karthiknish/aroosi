import { NextRequest } from "next/server";
import { adminStorage } from "@/lib/firebaseAdmin";

// Proxy (302 redirect) or stream a Firebase Storage object by its storageId (path after users/..).
// Usage: /api/storage/<storageId or full path>
// We expect callers to pass the full storage path like users/<uid>/profile-images/<filename>
// For backwards compatibility, if only a filename is provided we attempt to locate it under any user's profile-images (NOT recommended: O(n) listing, so we avoid and just 404).

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const start = Date.now();
  const { path } = await params;
  const segments = path || [];
  if (!segments.length) {
    return new Response(JSON.stringify({ error: "Missing path" }), { status: 400 });
  }
  // Reconstruct storage path
  const storagePath = segments.join("/");
  try {
    const bucket = adminStorage.bucket();
    // Security: only allow expected folder
    if (!storagePath.startsWith("users/") || storagePath.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), { status: 400 });
    }
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    // Use public URL for profile images since storage rules allow public read access
    let url: string;
    if (storagePath.startsWith("users/") && storagePath.includes("profile-images")) {
      // Use public URL for profile images
      const bucketName = bucket.name;
      url = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
    } else {
      // Generate signed URL for other files
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 });
      url = signedUrl;
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "X-Proxy-Time": `${Date.now() - start}ms`,
      },
    });
  } catch (e: any) {
    // Development fallback: if Firebase Admin fails, try to construct a public URL directly
    if (process.env.NODE_ENV === "development" && storagePath.includes("profile-images")) {
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
    return new Response(JSON.stringify({ error: e?.message || "Failed" }), { status: 500 });
  }
}
