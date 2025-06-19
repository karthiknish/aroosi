import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { Message } from '../../types/message';
import MessageStatusIndicator from './MessageStatusIndicator';
import PlatformHaptics from '../../utils/PlatformHaptics';

interface VoiceMessageProps {
  message: Message;
  isOwnMessage: boolean;
  showStatus?: boolean;
}

export default function VoiceMessage({
  message,
  isOwnMessage,
  showStatus = false,
}: VoiceMessageProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const waveformAnim = new Animated.Value(0);

  const {
    playbackState,
    loadAudio,
    play,
    pause,
    seekTo,
    getProgress,
    getFormattedTime,
  } = useAudioPlayback(false, () => {
    // Reset to beginning when playback completes
    PlatformHaptics.light();
  });

  // Initialize audio when component mounts
  useEffect(() => {
    if (message.voiceUrl && !isInitialized) {
      loadAudio(message.voiceUrl).then((loaded) => {
        setIsInitialized(loaded);
      });
    }
  }, [message.voiceUrl, loadAudio, isInitialized]);

  // Animate waveform when playing
  useEffect(() => {
    if (playbackState.isPlaying) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(waveformAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [playbackState.isPlaying, waveformAnim]);

  const handlePlayPause = async () => {
    await PlatformHaptics.light();
    
    if (playbackState.isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleSeek = async (percentage: number) => {
    if (playbackState.duration > 0) {
      const position = percentage * playbackState.duration;
      await seekTo(position);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms === 0 && message.voiceDuration) {
      return getFormattedTime(message.voiceDuration);
    }
    return getFormattedTime(ms);
  };

  const renderWaveform = () => {
    const waveform = message.voiceWaveform || generateDefaultWaveform();
    const progress = getProgress();

    return (
      <View style={styles.waveformContainer}>
        {waveform.map((height, index) => {
          const isActive = index / waveform.length <= progress;
          const animatedHeight = isActive && playbackState.isPlaying
            ? waveformAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [height, height * 1.5],
              })
            : height;

          return (
            <TouchableOpacity
              key={index}
              style={styles.waveformBarContainer}
              onPress={() => handleSeek(index / waveform.length)}
            >
              <Animated.View
                style={[
                  styles.waveformBar,
                  {
                    height: animatedHeight,
                    backgroundColor: isActive
                      ? (isOwnMessage ? Colors.background.primary : Colors.primary[500])
                      : Colors.neutral[300],
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage,
    ]}>
      <View style={styles.content}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[
            styles.playButton,
            isOwnMessage ? styles.ownPlayButton : styles.otherPlayButton,
          ]}
          onPress={handlePlayPause}
          disabled={!isInitialized || playbackState.isLoading}
        >
          {playbackState.isLoading ? (
            <Ionicons 
              name="hourglass" 
              size={20} 
              color={isOwnMessage ? Colors.primary[500] : Colors.background.primary} 
            />
          ) : (
            <Ionicons
              name={playbackState.isPlaying ? 'pause' : 'play'}
              size={20}
              color={isOwnMessage ? Colors.primary[500] : Colors.background.primary}
            />
          )}
        </TouchableOpacity>

        {/* Waveform and Duration */}
        <View style={styles.audioInfo}>
          {renderWaveform()}
          
          <View style={styles.durationContainer}>
            <Text style={[
              styles.duration,
              isOwnMessage ? styles.ownText : styles.otherText,
            ]}>
              {playbackState.isPlaying 
                ? getFormattedTime(playbackState.position)
                : formatDuration(playbackState.duration)}
            </Text>
            
            {playbackState.duration > 0 && (
              <Text style={[
                styles.totalDuration,
                isOwnMessage ? styles.ownTextSecondary : styles.otherTextSecondary,
              ]}>
                / {formatDuration(playbackState.duration)}
              </Text>
            )}
          </View>
        </View>

        {/* Status Indicator */}
        {showStatus && isOwnMessage && (
          <View style={styles.statusContainer}>
            <MessageStatusIndicator status={message.status} size={14} />
          </View>
        )}
      </View>

      {/* Error State */}
      {playbackState.error && (
        <Text style={styles.errorText}>
          Failed to load voice message
        </Text>
      )}
    </View>
  );
}

// Generate default waveform if not provided
function generateDefaultWaveform(): number[] {
  const bars = 20;
  return Array.from({ length: bars }, () => 
    4 + Math.random() * 16 // Heights between 4-20
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginVertical: Layout.spacing.xs,
  },

  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.lg,
    borderBottomRightRadius: Layout.radius.sm,
  },

  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutral[100],
    borderRadius: Layout.radius.lg,
    borderBottomLeftRadius: Layout.radius.sm,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ownPlayButton: {
    backgroundColor: Colors.background.primary,
  },

  otherPlayButton: {
    backgroundColor: Colors.primary[500],
  },

  audioInfo: {
    flex: 1,
    gap: Layout.spacing.xs,
  },

  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },

  waveformBarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Layout.spacing.xs,
  },

  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },

  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  duration: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    fontVariant: ['tabular-nums'],
  },

  totalDuration: {
    fontSize: Layout.typography.fontSize.xs,
    marginLeft: Layout.spacing.xs,
  },

  ownText: {
    color: Colors.background.primary,
  },

  otherText: {
    color: Colors.text.primary,
  },

  ownTextSecondary: {
    color: Colors.background.primary,
    opacity: 0.7,
  },

  otherTextSecondary: {
    color: Colors.text.secondary,
  },

  statusContainer: {
    marginLeft: Layout.spacing.xs,
  },

  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
    fontStyle: 'italic',
    marginTop: Layout.spacing.xs,
    marginHorizontal: Layout.spacing.md,
  },
});