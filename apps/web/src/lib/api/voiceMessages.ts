export async function uploadVoiceMessage(fd: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/voice-messages/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({} as any));
      const errText = (msg as any)?.error || (msg as any)?.message || `HTTP ${res.status}`;
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}


