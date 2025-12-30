import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { validateConversationId as legacyConversationIdValidator } from "@/lib/utils/messageValidation";
import { validateVoiceMessage, validateConversationId } from "@/lib/validation/message";
import { moderateProfanity } from "@/lib/moderation/profanity";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";
import { adminStorage, db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { buildVoiceMessage, COL_VOICE_MESSAGES, COL_BLOCKS } from "@/lib/firestoreSchema";
import { normalisePlan, getPlanLimits } from "@/lib/subscription/planLimits";
import { v4 as uuidv4 } from "uuid";
import { emitConversationEvent } from "@/lib/realtime/conversationEvents";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    let formData;
    try {
      formData = await ctx.request.formData();
    } catch {
      return errorResponse("Invalid form data", 400, { correlationId: ctx.correlationId });
    }

    const audioFile = formData.get("audio") as File;
    const conversationId = formData.get("conversationId") as string;
    const duration = parseFloat(formData.get("duration") as string);
    const toUserId = formData.get("toUserId") as string;

    // Optional waveform peaks
    const peaksRaw = formData.get("peaks") as string | null;
    let peaks: number[] | undefined = undefined;
    if (typeof peaksRaw === "string" && peaksRaw.length) {
      try {
        const parsed = JSON.parse(peaksRaw);
        if (Array.isArray(parsed) && parsed.every((n: any) => typeof n === "number" && n >= 0 && n <= 1)) {
          peaks = parsed.slice(0, 256);
        }
      } catch {}
    }

    // Validate required fields
    if (!audioFile || !conversationId || !duration || !toUserId) {
      return errorResponse("Missing required fields: audio, conversationId, duration, toUserId", 400, { correlationId: ctx.correlationId });
    }

    // Validate conversation ID format
    const convCheck = validateConversationId(conversationId);
    if (!convCheck.ok) {
      return errorResponse(convCheck.message || "Invalid conversationId", 400, { correlationId: ctx.correlationId });
    }
    if (!legacyConversationIdValidator(conversationId)) {
      return errorResponse("Invalid conversationId format (legacy)", 400, { correlationId: ctx.correlationId });
    }

    try {
      // Voice validation (plan aware)
      const profileSnap = await db.collection("users").doc(userId).get();
      const planRaw = profileSnap.exists ? (profileSnap.data() as any)?.subscriptionPlan : "free";
      const plan = normalisePlan(planRaw || "free");

      const voiceValidation = validateVoiceMessage({
        durationSec: duration,
        sizeBytes: audioFile.size,
        mimeType: audioFile.type,
        plan,
      });
      if (!voiceValidation.ok) {
        return errorResponse(voiceValidation.message || "Invalid audio", 400, { correlationId: ctx.correlationId });
      }

      // Verify user is part of this conversation
      const userIds = conversationId.split("_");
      if (!userIds.includes(userId)) {
        return errorResponse("Unauthorized access to conversation", 403, { correlationId: ctx.correlationId });
      }

      // Check if either user has blocked the other
      const [blockedForward, blockedReverse] = await Promise.all([
        db.collection(COL_BLOCKS).where("blockerId", "==", userId).where("blockedId", "==", toUserId).limit(1).get(),
        db.collection(COL_BLOCKS).where("blockerId", "==", toUserId).where("blockedId", "==", userId).limit(1).get(),
      ]);
      if (blockedForward.size > 0 || blockedReverse.size > 0) {
        return errorResponse("Cannot send voice message to this user", 403, { correlationId: ctx.correlationId });
      }

      // Enforce plan allowance
      const limits = getPlanLimits(plan);
      const planLimit = limits["voice_message_sent"] ?? 0;
      if (planLimit === 0) {
        return errorResponse("Upgrade required to send voice messages (plan limit is 0)", 402, { correlationId: ctx.correlationId });
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
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires: nowTimestamp() + 60 * 60 * 1000 });

      const vm = buildVoiceMessage({
        conversationId,
        fromUserId: userId,
        toUserId,
        storagePath,
        duration,
        fileSize: audioFile.size,
        mimeType: audioFile.type,
        peaks,
      });
      const docRef = await db.collection(COL_VOICE_MESSAGES).add(vm);

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
      };

      // Emit SSE-compatible conversation event (stored in Firestore for multi-instance)
      try {
        await emitConversationEvent(conversationId, {
          type: "message_sent",
          userId,
          message,
        });
      } catch {}

      return successResponse({
        message: "Voice message uploaded successfully",
        messageId: message._id,
        duration,
        storageId: storagePath,
        audioUrl: signedUrl,
        plan,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("voice-messages/upload error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to upload voice message", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "voice_messages_upload", maxRequests: 30 }
  }
);
