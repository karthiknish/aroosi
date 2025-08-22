import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const PUT = withFirebaseAuth(async (authUser, req: NextRequest) => {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      imageId?: string;
      profileId?: string; // optional admin support
    };
    const { imageId } = body;
    const profileId = body.profileId || authUser.id;
    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }
    if (profileId !== authUser.id && authUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userRef = db.collection("users").doc(profileId);
    const userSnap = await userRef.get();
    const data = userSnap.exists ? (userSnap.data() as any) : {};
    const existingIds: string[] = Array.isArray(data.profileImageIds)
      ? data.profileImageIds.slice()
      : [];
    const existingUrls: string[] = Array.isArray(data.profileImageUrls)
      ? data.profileImageUrls.slice()
      : [];

    // Normalize doc id from storageId
    const docId = imageId.includes("/") ? imageId.split("/").pop()! : imageId;
    const idx = existingIds.findIndex(
      (id) => (id.includes("/") ? id.split("/").pop()! : id) === docId
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: "Image not found in profile", code: "INVALID_IMAGE_ID" },
        { status: 404 }
      );
    }

    // Move image and corresponding url to front
    const idVal = existingIds[idx];
    existingIds.splice(idx, 1);
    existingIds.unshift(idVal);
    if (existingUrls.length === existingIds.length) {
      const urlVal = existingUrls[idx];
      existingUrls.splice(idx, 1);
      existingUrls.unshift(urlVal);
    }

    await userRef.set(
      {
        profileImageIds: existingIds,
        ...(existingUrls.length ? { profileImageUrls: existingUrls } : {}),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to set main image" },
      { status: 500 }
    );
  }
});

import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const PUT = withFirebaseAuth(async (authUser, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    // Parse body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", correlationId },
        { status: 400 }
      );
    }
    const imageId = body?.imageId as string | undefined;
    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId", correlationId },
        { status: 400 }
      );
    }

    // Ensure image metadata exists for this user
    const imageDocId = imageId.includes("/")
      ? imageId.split("/").pop()!
      : imageId;
    const imageDoc = await db
      .collection("users")
      .doc(authUser.id)
      .collection("images")
      .doc(imageDocId)
      .get();
    if (!imageDoc.exists) {
      return NextResponse.json(
        { error: "Image not found in user's images", correlationId },
        { status: 404 }
      );
    }

    // Load current ordering
    const userSnap = await db.collection("users").doc(authUser.id).get();
    const data = userSnap.data() || {};
    const current: string[] = Array.isArray(data.profileImageIds)
      ? data.profileImageIds
      : [];
    const storageId: string = imageDoc.data()?.storageId || imageId; // prefer canonical storageId
    const newOrder = [storageId, ...current.filter((id) => id !== storageId)];
    await db
      .collection("users")
      .doc(authUser.id)
      .set(
        { profileImageIds: newOrder, updatedAt: Date.now() },
        { merge: true }
      );

    console.info("Profile images MAIN PUT success", {
      scope: "profile_images.main",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Main profile image updated successfully",
        mainImageId: storageId,
        imageOrder: newOrder,
        correlationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile images MAIN PUT firebase error", {
      scope: "profile_images.main",
      type: "unhandled_error",
      error: error instanceof Error ? error.message : String(error),
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to set main profile image", correlationId },
      { status: 500 }
    );
  }
});
