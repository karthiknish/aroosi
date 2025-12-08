/**
 * Chat side-effectful actions (API calls, wrappers)
 */
import { safetyAPI } from "@/lib/api/safety";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import type { ReportReason } from "@/lib/chat/types";

/**
 * Wrap plain text send with delivery marking.
 */
export async function sendTextMessageAction(
  text: string,
  matchUserId: string,
  opts: {
    sendMessage: (payload: { toUserId: string; text: string }) => Promise<string | void>;
    markMessageAsPending?: (id: string) => void;
    markMessageAsSent?: (id: string) => void;
  }
) {
  const { sendMessage, markMessageAsPending, markMessageAsSent } = opts;
  if (!text.trim()) return;

  // mark pending with a client-side temp id if available
  const tempId = `tmp_${Date.now()}`;
  try {
    markMessageAsPending?.(tempId);
  } catch {
    // optional no-op
  }

  try {
    const serverId = (await sendMessage({ toUserId: matchUserId, text })) as string | void;
    if (serverId && typeof serverId === "string") {
      markMessageAsSent?.(serverId);
    } else {
      // Fallback: mark temp as sent
      markMessageAsSent?.(tempId);
    }
  } catch (e) {
    throw e;
  }
}

/**
 * Upload a voice blob, then send a message referencing it.
 * Note: uploadVoiceMessage signature requires a payload; we adapt to the expected shape here.
 */
export async function sendVoiceMessageAction(
  blob: Blob,
  matchUserId: string,
  durationSec: number,
  opts: {
    sendMessage: (payload: { toUserId: string; text?: string; audioStorageId?: string; duration?: number }) => Promise<string | void>;
    // optional fields to satisfy upload requirements if needed by your implementation
    conversationId?: string;
    fromUserId?: string;
    mimeType?: string;
  }
) {
  const { sendMessage, conversationId = "", fromUserId = "", mimeType } = opts;

  // Upload to storage (adapt to expected payload shape)
  const uploaded = await uploadVoiceMessage({
    conversationId,
    fromUserId,
    toUserId: matchUserId,
    blob,
    mimeType,
    duration: durationSec,
  } as any);

  const storageId = (uploaded as any)?.storageId || (uploaded as any)?.id || (uploaded as any)?.audioStorageId;
  if (!storageId) {
    throw new Error("Voice upload failed");
  }

  // Send message that references the uploaded audio
  await sendMessage({
    toUserId: matchUserId,
    audioStorageId: storageId,
    duration: durationSec,
  });
}

/**
 * Report a user with reason + description via safety API.
 * safetyAPI.reportUser in this codebase typically accepts (payload, token)
 */
export async function reportUserAction(
  matchUserId: string,
  reason: ReportReason,
  description: string,
) {
  await safetyAPI.reportUser(null, {
    reportedUserId: matchUserId,
    reason: reason as any,
    description,
  } as any);
}

/**
 * Block a user via safety API. Typically (payload, token)
 */
export async function blockUserAction(matchUserId: string) {
  await safetyAPI.blockUser(null, matchUserId as any);
}

/**
 * Unblock a previously blocked user.
 */
export async function unblockUserAction(matchUserId: string) {
  await safetyAPI.unblockUser(null, matchUserId as any);
}