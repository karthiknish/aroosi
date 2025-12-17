import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderButtonProps {
  onSend: (blob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
  onRecordingStart?: () => void;
  onRecordingError?: (error: Error) => void;
  onUpgradeRequired?: () => void;
  maxDuration?: number; // seconds
  className?: string;
  disabled?: boolean;
  canSendVoice?: boolean;
}

/**
 * Enhanced voice recorder button with visual feedback and subscription gating
 * Matches mobile implementation features
 */
const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  onSend,
  onCancel,
  onRecordingStart,
  onRecordingError,
  onUpgradeRequired,
  maxDuration = 120,
  className = "",
  disabled = false,
  canSendVoice = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "processing" | "error"
  >("idle");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setHasPermission(result.state === "granted");

        result.onchange = () => {
          setHasPermission(result.state === "granted");
        };
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        setHasPermission(null);
      }
    };

    checkPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    // Check if user can send voice messages based on subscription
    if (!canSendVoice) {
      onUpgradeRequired?.();
      return;
    }

    setRecordingState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecordingState("processing");

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = elapsed;
        setIsRecording(false);

        try {
          await onSend(blob, duration);
          setRecordingState("idle");
        } catch (error) {
          setRecordingState("error");
          onRecordingError?.(
            error instanceof Error
              ? error
              : new Error("Failed to send voice message")
          );
        }
      };

      recorder.onerror = (event) => {
        setRecordingState("error");
        onRecordingError?.(new Error("Recording failed"));
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      onRecordingStart?.();

      // Auto-stop after maxDuration
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, maxDuration * 1000);
    } catch (err) {
      console.error("Could not start recording", err);
      setHasPermission(false);
      setRecordingState("error");
      onRecordingError?.(
        err instanceof Error
          ? err
          : new Error("Microphone permission denied or unavailable")
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingState("idle");
    setElapsed(0);
    onCancel?.();
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        disabled={disabled || recordingState === "processing" || !canSendVoice}
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-white transition-all duration-200",
          isRecording
            ? "bg-danger hover:bg-danger-dark"
            : canSendVoice
              ? "bg-primary hover:bg-primary-dark"
              : "bg-neutral/40 cursor-not-allowed",
          "disabled:opacity-50",
          className
        )}
        whileHover={canSendVoice && !disabled ? { scale: 1.05 } : {}}
        whileTap={canSendVoice && !disabled ? { scale: 0.95 } : {}}
      >
        {recordingState === "processing" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : isRecording ? (
          <>
            <motion.div
              className="h-2 w-2 rounded-full bg-base-light"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            Stop ({formatElapsed(elapsed)})
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Record
          </>
        )}
      </motion.button>

      {/* Cancel button when recording */}
      {isRecording && (
        <motion.button
          type="button"
          onClick={cancelRecording}
          className="px-3 py-2 text-sm text-neutral-light hover:text-neutral hover:bg-neutral/5 rounded-lg transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          Cancel
        </motion.button>
      )}

      {/* Permission/Subscription messages */}
      {hasPermission === false && (
        <div className="text-xs text-warning ml-2">
          Microphone permission required
        </div>
      )}

      {!canSendVoice && (
        <button
          type="button"
          className="text-xs text-primary ml-2 underline"
          onClick={onUpgradeRequired}
          aria-label="Upgrade to Premium to send voice messages"
        >
          Upgrade to Premium
        </button>
      )}
    </div>
  );
};

export default VoiceRecorderButton;
