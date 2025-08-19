import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
// Using new centralized validators (conversation + voice)
import {
  validateConversationId as legacyConversationIdValidator,
} from "@/lib/utils/messageValidation";
import { validateVoiceMessage, validateConversationId } from "@/lib/validation/message";
import { moderateProfanity } from "@/lib/moderation/profanity";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { adminStorage, db } from "@/lib/firebaseAdmin";
import { buildVoiceMessage, COL_VOICE_MESSAGES } from "@/lib/firestoreSchema";
import { normalisePlan, getPlanLimits } from "@/lib/subscription/planLimits";
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
    // Standardize feature key to voice_message_sent (align with plan limits & usageEvents)
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string,
      userId || "unknown",
      "voice_message_sent",
      60_000
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

    // Validate conversation ID format using new validator (fallback to legacy for safety)
    const convCheck = validateConversationId(conversationId);
    if (!convCheck.ok) {
      return errorResponse(convCheck.message || "Invalid conversationId", 400);
    }
    // Extra defense: legacy format check (should pass if new ok)
    if (!legacyConversationIdValidator(conversationId)) {
      return errorResponse("Invalid conversationId format (legacy)", 400);
    }

    // Voice validation (plan aware: different duration/size per plan)
    const profileSnap = await db.collection("users").doc(userId!).get();
    const planRaw = profileSnap.exists
      ? (profileSnap.data() as any)?.subscriptionPlan
      : "free";
    const plan = normalisePlan(planRaw || "free");

    const voiceValidation = validateVoiceMessage({
      durationSec: duration,
      sizeBytes: audioFile.size,
      mimeType: audioFile.type,
      plan,
    });
    if (!voiceValidation.ok) {
      return errorResponse(voiceValidation.message || "Invalid audio", 400);
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

    // Enforce plan allowance (free plan has 0 allowance per PLAN_LIMITS)
    const limits = getPlanLimits(plan);
    const planLimit = limits["voice_message_sent"] ?? 0;
    if (planLimit === 0) {
      return errorResponse(
        "Upgrade required to send voice messages (plan limit is 0)",
        402
      );
    }

    // Secondary rolling 24h guard (adaptive):
    // Preserve previous behavior limiting bursts even if monthly quota is large or unlimited.
    // Only apply if planLimit is unlimited (-1) OR exceeds the dailyBurstCap.
    const dailyBurstCap = 10;
    if (plan === "premium" || plan === "premiumPlus") {
      if (planLimit === -1 || planLimit > dailyBurstCap) {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const countSnap = await db
          .collection(COL_VOICE_MESSAGES)
          .where("fromUserId", "==", userId)
          .where("createdAt", ">", since)
          .get();
        if (countSnap.size >= dailyBurstCap) {
          return errorResponse(
            `Daily voice message burst limit reached (${dailyBurstCap} / 24h).`,
            429
          );
        }
      }
    }

    // Monthly quota enforcement using usageEvents collection (mirrors messages/send)
    try {
      const feature = "voice_message_sent";
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageDocId = `${userId}_${feature}_${monthKey}`;
      const usageRef = db.collection("usageEvents").doc(usageDocId);
      const usageSnap = await usageRef.get();
      const currentCount = usageSnap.exists
        ? (usageSnap.data() as any).count || 0
        : 0;
      const effectiveLimit = planLimit; // from plan limits above
      if (effectiveLimit !== -1 && currentCount >= effectiveLimit) {
        return errorResponse("Monthly voice message quota exceeded", 429, {
          correlationId,
          feature,
          limit: effectiveLimit,
        } as any);
      }
      await usageRef.set(
        {
          feature,
          month: monthKey,
          userId,
          count: currentCount + 1,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (quotaErr) {
      console.warn("voice.quotaCheckFailed", quotaErr);
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
    // Generate placeholder text & pass through profanity moderation (defensive; placeholder benign but future changes could add metadata)
    const placeholder = `Voice message (${formatVoiceDuration(duration)})`;
    const moderated = moderateProfanity(placeholder);
    const safeText = moderated.clean ? placeholder : moderated.sanitized;
    const message = {
      _id: docRef.id,
      conversationId,
      fromUserId: userId,
      toUserId,
      text: safeText,
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
        plan,
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
