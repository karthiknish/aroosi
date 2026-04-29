export interface VoiceUploadMessage {
  _id: string;
  id?: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type: "voice";
  audioStorageId: string;
  duration: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
}

export interface VoiceUploadResponse {
  success: boolean;
  error?: string;
  message?: VoiceUploadMessage;
  messageId?: string;
  storageId?: string;
  audioUrl?: string;
  duration?: number;
}

export async function uploadVoiceMessage(fd: FormData): Promise<VoiceUploadResponse> {
  try {
    const res = await fetch("/api/voice-messages/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      const errText =
        typeof msg === "object" && msg !== null
          ? String((msg as { error?: string; message?: string }).error || (msg as { error?: string; message?: string }).message || `HTTP ${res.status}`)
          : `HTTP ${res.status}`;
      return { success: false, error: errText };
    }
    const payload = (await res.json().catch(() => ({}))) as {
      data?: {
        message?: VoiceUploadMessage;
        messageId?: string;
        storageId?: string;
        audioUrl?: string;
        duration?: number;
      };
    };
    return {
      success: true,
      message: payload.data?.message,
      messageId: payload.data?.messageId,
      storageId: payload.data?.storageId,
      audioUrl: payload.data?.audioUrl,
      duration: payload.data?.duration,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Network error" };
  }
}


