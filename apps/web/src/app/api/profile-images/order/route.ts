import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const POST = withFirebaseAuth(async (authUser, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    let body: {
      profileId?: string;
      imageIds?: string[];
      skipUrlReorder?: boolean;
      rebuildUrls?: boolean;
    } = {} as any;
    try {
      body = await req.json();
    } catch {}
    const { profileId, imageIds, skipUrlReorder, rebuildUrls } = body;

    if (!profileId || !Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "Missing profileId or imageIds", correlationId },
        { status: 400 }
      );
    }

    // Authorization: user can reorder own images; admins can reorder any.
    if (authUser.id !== profileId && authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized", correlationId },
        { status: 403 }
      );
    }

    // Validate & fetch each image doc in parallel (single pass) and build maps
    const imagesCol = db
      .collection("users")
      .doc(profileId)
      .collection("images");
    const docIds = imageIds.map((imgId) =>
      imgId.includes("/") ? imgId.split("/").pop()! : imgId
    );
    const imageDocs = await Promise.all(
      docIds.map(async (docId) => {
        const snap = await imagesCol.doc(docId).get();
        return { docId, snap };
      })
    );
    const invalid = imageDocs.filter((d) => !d.snap.exists).map((d) => d.docId);
    if (invalid.length) {
      // Return a semantic error code so client can map to a friendly toast.
      return NextResponse.json(
        {
          error:
            "Some provided image IDs do not exist or have not finished uploading.",
          code: "INVALID_IMAGE_IDS",
          invalidIds: invalid,
          correlationId,
        },
        { status: 422 }
      );
    }
    // Build normalized storageIds and url map from image docs (if present)
    const normalized: string[] = [];
    const storageIdToUrl: Record<string, string> = {};
    for (const { docId, snap } of imageDocs) {
      const data = snap.data() as any;
      const storageId = data?.storageId || docId; // fallback on doc id
      normalized.push(storageId);
      if (data?.url) storageIdToUrl[storageId] = data.url;
    }

    const userRef = db.collection("users").doc(profileId);
    const userSnap = await userRef.get();
    let urls: string[] = [];
    if (!skipUrlReorder) {
      if (rebuildUrls) {
        // Rebuild purely from storageId->url map; if missing, insert empty string placeholder
        urls = normalized.map((id) => storageIdToUrl[id] || "");
      } else if (userSnap.exists) {
        const d = userSnap.data() as any;
        const existingUrls: string[] = Array.isArray(d.profileImageUrls)
          ? d.profileImageUrls.slice()
          : [];
        const existingIds: string[] = Array.isArray(d.profileImageIds)
          ? d.profileImageIds
          : [];
        const map: Record<string, string> = {};
        existingIds.forEach((id, idx) => {
          map[id] = existingUrls[idx];
        });
        // Fill from map first, then override with any newer url discovered from image docs
        urls = normalized.map((id) => storageIdToUrl[id] || map[id] || "");
      } else {
        urls = normalized.map((id) => storageIdToUrl[id] || "");
      }
    } else if (userSnap.exists) {
      // Preserve existing order of URLs if skipping reorder (still ensure length alignment)
      const d = userSnap.data() as any;
      const existingUrls: string[] = Array.isArray(d.profileImageUrls)
        ? d.profileImageUrls.slice()
        : [];
      urls =
        existingUrls.length === normalized.length
          ? existingUrls
          : normalized.map((id, idx) => existingUrls[idx] || "");
    }
    await userRef.set(
      {
        profileImageIds: normalized,
        // Only write urls if we actually computed a reordered list (skipUrlReorder means leave untouched)
        ...(skipUrlReorder ? {} : { profileImageUrls: urls }),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    console.info("Profile images ORDER success", {
      scope: "profile_images.order",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        success: true,
        correlationId,
        normalizedCount: normalized.length,
        reorderedUrls: !skipUrlReorder,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/profile-images/order firebase error", {
      scope: "profile_images.order",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to update order", correlationId },
      { status: 500 }
    );
  }
});
