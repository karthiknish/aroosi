/**
 * Audio helpers for recording and visualization (lightweight bars).
 * - MIME preference: audio/webm, fallback audio/m4a
 * - Client caps: max duration 300s, max size 10MB (enforced in recorder hook / upload step)
 */

export const MAX_DURATION_SECONDS = 300; // 5 minutes
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export type SupportedMime = "audio/webm" | "audio/m4a";

export function pickPreferredMime(supported: string[] = []): SupportedMime {
  // Prefer audio/webm (widely supported in Chromium), fallback to m4a if provided by browser/encoder
  const hasWebm = supported.includes("audio/webm");
  const hasM4a = supported.includes("audio/m4a") || supported.includes("audio/mp4");
  if (hasWebm) return "audio/webm";
  if (hasM4a) return "audio/m4a";
  // Default to webm; encoder may still provide ogg/webm under the hood.
  return "audio/webm";
}

export function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Generate lightweight peaks (bars) for waveform visualization from an AudioBuffer.
 * Downsamples to a fixed number of bars for performance.
 */
export function generateWaveformPeaks(
  audioBuffer: AudioBuffer,
  bars: number = 64
): number[] {
  const { numberOfChannels, length } = audioBuffer;
  if (length === 0 || bars <= 0) return [];

  // Merge channels to mono by averaging absolute values
  const merged = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      merged[i] += Math.abs(data[i]) / numberOfChannels;
    }
  }

  const blockSize = Math.floor(length / bars) || 1;
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = merged[j];
      if (v > peak) peak = v;
    }
    // Clamp and normalize to [0,1]
    peaks.push(Math.max(0, Math.min(1, peak)));
  }
  return peaks;
}

/**
 * Decode an audio Blob into an AudioBuffer (WebAudio API).
 * Caller should create a single AudioContext and reuse it when possible.
 */
export async function decodeToAudioBuffer(
  audioContext: AudioContext,
  blob: Blob
): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Utility to check file size and duration constraints before upload.
 * Duration should be provided by the recorder (ms). File size from Blob.size.
 */
export function validateAudioCaps({
  durationMs,
  sizeBytes,
  maxDurationSeconds = MAX_DURATION_SECONDS,
  maxBytes = MAX_FILE_BYTES,
}: {
  durationMs: number;
  sizeBytes: number;
  maxDurationSeconds?: number;
  maxBytes?: number;
}): { ok: boolean; error?: string } {
  if (durationMs <= 0) return { ok: false, error: "Invalid duration" };
  if (durationMs / 1000 > maxDurationSeconds)
    return { ok: false, error: `Audio too long (max ${maxDurationSeconds}s)` };
  if (sizeBytes > maxBytes)
    return { ok: false, error: `File too large (max ${Math.floor(maxBytes / 1024 / 1024)}MB)` };
  return { ok: true };
}

/**
 * Build FormData for the /api/voice-messages/upload endpoint.
 */
export async function buildVoiceUploadFormData(params: {
  blob: Blob;
  conversationId: string;
  durationSeconds: number;
  toUserId: string;
}): Promise<FormData> {
  const fd = new FormData();
  fd.append("audio", params.blob, suggestFileName(params.blob.type));
  fd.append("conversationId", params.conversationId);
  fd.append("duration", String(params.durationSeconds));
  fd.append("toUserId", params.toUserId);
  return fd;
}

export function suggestFileName(mime: string): string {
  if (mime.includes("webm")) return `voice-${Date.now()}.webm`;
  if (mime.includes("m4a") || mime.includes("mp4")) return `voice-${Date.now()}.m4a`;
  return `voice-${Date.now()}.webm`;
}