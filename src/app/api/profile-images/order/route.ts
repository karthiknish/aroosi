import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const POST = withFirebaseAuth(async (authUser, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    let body: { profileId?: string; imageIds?: string[] } = {} as any;
    try {
      body = await req.json();
    } catch {}
    const { profileId, imageIds } = body;

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

    // Validate each image belongs to this user (best-effort)
    const imagesCol = db
      .collection("users")
      .doc(profileId)
      .collection("images");
    const invalid: string[] = [];
    await Promise.all(
      imageIds.map(async (imgId) => {
        const docId = imgId.includes("/") ? imgId.split("/").pop()! : imgId;
        const snap = await imagesCol.doc(docId).get();
        if (!snap.exists) invalid.push(imgId);
      })
    );
    if (invalid.length) {
      return NextResponse.json(
        { error: `Invalid image IDs: ${invalid.join(", ")}`, correlationId },
        { status: 400 }
      );
    }

    // Normalize to stored storageId values
    const normalized: string[] = [];
    for (const imgId of imageIds) {
      const docId = imgId.includes("/") ? imgId.split("/").pop()! : imgId;
      const snap = await imagesCol.doc(docId).get();
      const storageId = (snap.data() as any)?.storageId || imgId;
      normalized.push(storageId);
    }

    await db
      .collection("users")
      .doc(profileId)
      .set(
        { profileImageIds: normalized, updatedAt: Date.now() },
        { merge: true }
      );

    console.info("Profile images ORDER success", {
      scope: "profile_images.order",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true, correlationId }, { status: 200 });
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
