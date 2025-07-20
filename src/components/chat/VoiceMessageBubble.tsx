import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";
import { getVoiceMessageUrl, type MatchMessage } from "@/lib/api/matchMessages";

interface VoiceMessageProps {
  message: MatchMessage;
  isPlaying: boolean;
  onPlayToggle: (playing: boolean) => void;
  isCurrentUser: boolean;
  token: string;
}

/**
 * Voice message component aligned with mobile implementation
 * Uses unified API for secure voice message playback
 */
const VoiceMessage: React.FC<VoiceMessageProps> = ({
  message,
  isPlaying,
  onPlayToggle,
  isCurrentUser,
  token,
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio URL when component mounts or storage ID changes
  useEffect(() => {
    const loadAudioUrl = async () => {
      if (!message.audioStorageId) {
        setError("No audio storage ID");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getVoiceMessageUrl({
          storageId: message.audioStorageId,
          token,
        });

        if (response.success && response.data?.url) {
          setAudioUrl(response.data.url);
        } else {
          setError(response.error?.message || "Failed to load audio");
        }
      } catch (err) {
        console.error("Error loading voice message URL:", err);
        setError("Failed to load audio");
      } finally {
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [message.audioStorageId, token]);

  // Handle play/pause toggle
  const handlePlayToggle = async () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      onPlayToggle(false);
    } else {
      try {
        await audioRef.current.play();
        onPlayToggle(true);
      } catch (err) {
        console.error("Error playing audio:", err);
        setError("Failed to play audio");
      }
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      onPlayToggle(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError("Audio playback error");
      onPlayToggle(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl, onPlayToggle]);

  // Stop playback when component unmounts or isPlaying becomes false
  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const duration = message.duration || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <Volume2 className="w-4 h-4" />
        <span className="text-sm">Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlayToggle}
        disabled={loading || !audioUrl}
        className={`p-2 rounded-full ${
          isCurrentUser
            ? "hover:bg-white/20 text-white"
            : "hover:bg-gray-200 text-gray-700"
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>

      {/* Waveform/Progress Bar */}
      <div className="flex-1 space-y-1">
        <div
          className={`h-1 rounded-full ${
            isCurrentUser ? "bg-white/30" : "bg-gray-300"
          } relative overflow-hidden`}
        >
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isCurrentUser ? "bg-white" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Duration Display */}
        <div className="flex justify-between text-xs">
          <span className={isCurrentUser ? "text-white/80" : "text-gray-500"}>
            {formatVoiceDuration(currentTime)}
          </span>
          <span className={isCurrentUser ? "text-white/80" : "text-gray-500"}>
            {formatVoiceDuration(duration)}
          </span>
        </div>
      </div>

      {/* Voice Icon */}
      <Volume2
        className={`w-4 h-4 ${isCurrentUser ? "text-white/80" : "text-gray-500"}`}
      />
    </div>
  );
};

export default VoiceMessage;
