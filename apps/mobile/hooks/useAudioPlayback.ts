import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // in milliseconds
  duration: number; // in milliseconds
  playbackRate: number;
  error: string | null;
}

export interface UseAudioPlaybackResult {
  // State
  playbackState: AudioPlaybackState;
  
  // Actions
  loadAudio: (uri: string) => Promise<boolean>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  
  // Helpers
  getProgress: () => number; // 0-1
  getFormattedTime: (milliseconds?: number) => string;
  getRemainingTime: () => string;
}

export function useAudioPlayback(
  autoPlay = false,
  onPlaybackComplete?: () => void
): UseAudioPlaybackResult {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    playbackRate: 1.0,
    error: null,
  });

  const sound = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);

  // Load audio file
  const loadAudio = useCallback(async (uri: string): Promise<boolean> => {
    try {
      setPlaybackState(prev => ({ ...prev, isLoading: true, error: null }));

      // Unload previous sound
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
        isLoadedRef.current = false;
      }

      // Create new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: autoPlay,
          progressUpdateIntervalMillis: 100,
        }
      );

      sound.current = newSound;
      isLoadedRef.current = true;

      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackState(prev => ({
            ...prev,
            isPlaying: status.isPlaying || false,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
            playbackRate: status.rate || 1.0,
            isLoading: false,
          }));

          // Handle playback completion
          if (status.didJustFinish) {
            onPlaybackComplete?.();
          }
        } else if (status.error) {
          setPlaybackState(prev => ({
            ...prev,
            error: status.error || 'Playback error',
            isLoading: false,
          }));
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to load audio:', error);
      setPlaybackState(prev => ({
        ...prev,
        error: 'Failed to load audio',
        isLoading: false,
      }));
      return false;
    }
  }, [autoPlay, onPlaybackComplete]);

  // Play audio
  const play = useCallback(async (): Promise<void> => {
    try {
      if (!sound.current || !isLoadedRef.current) {
        throw new Error('Audio not loaded');
      }

      await sound.current.playAsync();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setPlaybackState(prev => ({
        ...prev,
        error: 'Failed to play audio',
      }));
    }
  }, []);

  // Pause audio
  const pause = useCallback(async (): Promise<void> => {
    try {
      if (!sound.current || !isLoadedRef.current) {
        return;
      }

      await sound.current.pauseAsync();
    } catch (error) {
      console.error('Failed to pause audio:', error);
    }
  }, []);

  // Stop audio
  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!sound.current || !isLoadedRef.current) {
        return;
      }

      await sound.current.stopAsync();
      await sound.current.setPositionAsync(0);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }, []);

  // Seek to position
  const seekTo = useCallback(async (position: number): Promise<void> => {
    try {
      if (!sound.current || !isLoadedRef.current) {
        return;
      }

      const clampedPosition = Math.max(0, Math.min(position, playbackState.duration));
      await sound.current.setPositionAsync(clampedPosition);
    } catch (error) {
      console.error('Failed to seek audio:', error);
    }
  }, [playbackState.duration]);

  // Set playback rate
  const setPlaybackRate = useCallback(async (rate: number): Promise<void> => {
    try {
      if (!sound.current || !isLoadedRef.current) {
        return;
      }

      const clampedRate = Math.max(0.5, Math.min(rate, 2.0));
      await sound.current.setRateAsync(clampedRate, true);
    } catch (error) {
      console.error('Failed to set playback rate:', error);
    }
  }, []);

  // Get progress as percentage (0-1)
  const getProgress = useCallback((): number => {
    if (playbackState.duration === 0) {
      return 0;
    }
    return playbackState.position / playbackState.duration;
  }, [playbackState.position, playbackState.duration]);

  // Format time in MM:SS format
  const getFormattedTime = useCallback((milliseconds?: number): string => {
    const ms = milliseconds ?? playbackState.position;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [playbackState.position]);

  // Get remaining time
  const getRemainingTime = useCallback((): string => {
    const remaining = playbackState.duration - playbackState.position;
    return getFormattedTime(Math.max(0, remaining));
  }, [playbackState.duration, playbackState.position, getFormattedTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  return {
    playbackState,
    loadAudio,
    play,
    pause,
    stop,
    seekTo,
    setPlaybackRate,
    getProgress,
    getFormattedTime,
    getRemainingTime,
  };
}