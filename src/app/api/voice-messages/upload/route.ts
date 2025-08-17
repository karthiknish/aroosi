import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { validateConversationId } from "@/lib/utils/messageValidation";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { adminStorage, db } from "@/lib/firebaseAdmin";
import { buildVoiceMessage, COL_VOICE_MESSAGES } from "@/lib/firestoreSchema";
import { normalisePlan } from "@/lib/subscription/planLimits";
import { COL_BLOCKS } from "@/lib/firestoreSchema";
import { successResponse as ok } from "@/lib/apiResponse"; // alias example (avoid accidental shadowing)
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    // Subscription-aware rate limiting for voice uploads
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token provided
      userId || "unknown",
      "voice_upload",
      60000
    );
    if (!rate.allowed) {
      return errorResponse(
        rate.error ||
          "Rate limit exceeded. Please wait before uploading more voice messages.",
        429
      );
    }

    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data", 400);
    }

    const audioFile = formData.get("audio") as File;
    const conversationId = formData.get("conversationId") as string;
    const duration = parseFloat(formData.get("duration") as string);
    const toUserId = formData.get("toUserId") as string;

    // Optional waveform peaks (JSON array of normalized numbers 0..1)
    const peaksRaw = formData.get("peaks") as string | null;
    let peaks: number[] | undefined = undefined;
    if (typeof peaksRaw === "string" && peaksRaw.length) {
      try {
        const parsed = JSON.parse(peaksRaw);
        if (
          Array.isArray(parsed) &&
          parsed.every((n: any) => typeof n === "number" && n >= 0 && n <= 1)
        ) {
          // Bound payload size defensively
          peaks = parsed.slice(0, 256);
        }
      } catch {
        // ignore malformed peaks; proceed without it
      }
    }

    // Validate required fields
    if (!audioFile || !conversationId || !duration || !toUserId) {
      return errorResponse(
        "Missing required fields: audio, conversationId, duration, toUserId",
        400
      );
    }

    // Validate conversation ID format
    if (!validateConversationId(conversationId)) {
      return errorResponse("Invalid conversationId format", 400);
    }

    // Validate file type
    if (!audioFile.type.startsWith("audio/")) {
      return errorResponse("Invalid file type. Must be audio.", 400);
    }

    // Validate file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      return errorResponse("File too large. Maximum size is 10MB.", 400);
    }

    // Validate duration (limit to 5 minutes)
    if (duration <= 0 || duration > 300) {
      return errorResponse(
        "Invalid duration. Must be between 1 second and 5 minutes.",
        400
      );
    }

    // Verify user is part of this conversation
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403);
    }

    // Check if either user has blocked the other (bidirectional)
    const [blockedForward, blockedReverse] = await Promise.all([
      db
        .collection(COL_BLOCKS)
        .where("blockerId", "==", userId)
        .where("blockedId", "==", toUserId)
        .limit(1)
        .get(),
      db
        .collection(COL_BLOCKS)
        .where("blockerId", "==", toUserId)
        .where("blockedId", "==", userId)
        .limit(1)
        .get(),
    ]);
    if (blockedForward.size > 0 || blockedReverse.size > 0) {
      return errorResponse("Cannot send voice message to this user", 403);
    }

    // Enforce plan-based limits:
    // free: disallowed
    // premium: 10 per rolling 24h window
    // premiumPlus / premium_plus: unlimited
    // (If plan naming mismatch, normalise to lowercase for comparison.)
    const profileSnap = await db.collection("users").doc(userId!).get();
    const planRaw = profileSnap.exists
      ? (profileSnap.data() as any)?.subscriptionPlan
      : "free";
    const plan = normalisePlan(planRaw || "free");
    if (plan === "free") {
      return errorResponse(
        "Upgrade required to send voice messages (not available on free plan)",
        402
      );
    }
    let canSendVoice = true;
    if (plan === "premium") {
      const since = Date.now() - 24 * 60 * 60 * 1000; // last 24h
      const countSnap = await db
        .collection(COL_VOICE_MESSAGES)
        .where("fromUserId", "==", userId)
        .where("createdAt", ">", since)
        .get();
      if (countSnap.size >= 10) canSendVoice = false;
    }
    if (!canSendVoice) {
      return errorResponse(
        "Daily voice message limit reached for your plan (10 / 24h). Upgrade for unlimited.",
        429
      );
    }

    // Upload to Firebase Storage
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const objectId = uuidv4();
    const storagePath = `voiceMessages/${conversationId}/${objectId}`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      contentType: audioFile.type,
      metadata: { cacheControl: "public,max-age=31536000" },
    });
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    const vm = buildVoiceMessage({
      conversationId,
      fromUserId: userId!,
      toUserId,
      storagePath,
      duration,
      fileSize: audioFile.size,
      mimeType: audioFile.type,
      peaks,
    });
    const docRef = await db.collection(COL_VOICE_MESSAGES).add(vm);
    const message = {
      _id: docRef.id,
      conversationId,
      fromUserId: userId,
      toUserId,
      text: `Voice message (${formatVoiceDuration(duration)})`,
      type: "voice",
      audioStorageId: storagePath,
      duration,
      fileSize: audioFile.size,
      mimeType: audioFile.type,
      createdAt: vm.createdAt,
    } as any;

    // Emit SSE message_sent for voice message
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_sent",
        message,
      });
    } catch (eventError) {
      console.warn("Voice message SSE emit failed", {
        scope: "voice.upload",
        correlationId,
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    return successResponse(
      {
        message: "Voice message uploaded successfully",
        messageId: message._id,
        duration,
        storageId: storagePath,
        audioUrl: signedUrl,
        correlationId,
        durationMs: Date.now() - startedAt,
      },
      200
    );
  } catch (error) {
    devLog("error", "voice.upload", "Failed to upload voice message", {
      error: error instanceof Error ? error.message : String(error),
      correlationId,
    });
    return errorResponse("Failed to upload voice message", 500);
  }
}
