import React, { useEffect, useRef, useState } from "react";

interface VoiceRecorderButtonProps {
  onSend: (blob: Blob, duration: number) => Promise<void>;
  maxDuration?: number; // seconds
  className?: string;
}

/**
 * Button that toggles voice recording using the MediaRecorder API.
 * Once the user stops recording (or hits the maxDuration) the audio blob is
 * passed up via `onSend`.
 */
const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  onSend,
  maxDuration = 120,
  className = "",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = elapsed;
        setIsRecording(false);
        await onSend(blob, duration);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

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
      alert("Microphone permission denied or unavailable.");
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
    <button
      type="button"
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 ${className}`}
      onClick={isRecording ? stopRecording : startRecording}
    >
      {isRecording ? (
        <>
          <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />{" "}
          Stop ({formatElapsed(elapsed)})
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 1v11m0 0a4 4 0 004-4m-4 4a4 4 0 01-4-4m8 4v2a6 6 0 11-12 0v-2m12 0H4"
            />
          </svg>
          Record
        </>
      )}
    </button>
  );
};

export default VoiceRecorderButton;
