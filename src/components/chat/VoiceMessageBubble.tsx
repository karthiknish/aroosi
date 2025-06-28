import React from "react";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration: number; // seconds
  isOwn?: boolean;
}

/**
 * Renders a simple audio player styled like a chat bubble.
 */
const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  audioUrl,
  duration,
  isOwn = false,
}) => {
  return (
    <div
      className={`max-w-xs rounded-lg p-2 shadow-md flex items-center gap-2 ${isOwn ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"}`}
    >
      <audio controls src={audioUrl} className="flex-1">
        Your browser does not support the audio element.
      </audio>
      <span className="text-xs whitespace-nowrap">
        {formatVoiceDuration(duration)}
      </span>
    </div>
  );
};

export default VoiceMessageBubble;
