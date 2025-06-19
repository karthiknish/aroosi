import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import PlatformHaptics from '../../utils/PlatformHaptics';

const { width: screenWidth } = Dimensions.get('window');

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  visible: boolean;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  visible,
}: VoiceRecorderProps) {
  const {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playRecording,
  } = useVoiceRecording();

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Show/hide animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Recording pulse animation
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [recordingState.isRecording, recordingState.isPaused, pulseAnim]);

  // Wave animation
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
      const waveAnimation = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      waveAnimation.start();

      return () => {
        waveAnimation.stop();
        waveAnim.setValue(0);
      };
    }
  }, [recordingState.isRecording, recordingState.isPaused, waveAnim]);

  const handleStartRecording = async () => {
    const started = await startRecording();
    if (started) {
      await PlatformHaptics.light();
    }
  };

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      onRecordingComplete(uri, recordingState.duration);
    }
  };

  const handleCancel = async () => {
    await cancelRecording();
    onCancel();
  };

  const handlePauseResume = async () => {
    if (recordingState.isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePreviewPlay = () => {
    if (recordingState.recordingUri) {
      playRecording(recordingState.recordingUri);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Ionicons name="close" size={24} color={Colors.text.secondary} />
        </TouchableOpacity>

        {/* Recording Area */}
        <View style={styles.recordingArea}>
          {/* Wave Visualization */}
          <View style={styles.waveContainer}>
            {[...Array(5)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBars,
                  {
                    height: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 20 + Math.random() * 20],
                    }),
                    opacity: recordingState.isRecording && !recordingState.isPaused ? 1 : 0.3,
                  },
                ]}
              />
            ))}
          </View>

          {/* Duration */}
          <Text style={styles.duration}>
            {formatDuration(recordingState.duration)}
          </Text>

          {/* Recording Status */}
          <Text style={styles.status}>
            {!recordingState.isRecording && !recordingState.recordingUri
              ? 'Tap to start recording'
              : recordingState.isPaused
              ? 'Recording paused'
              : recordingState.isRecording
              ? 'Recording...'
              : 'Recording complete'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!recordingState.isRecording && !recordingState.recordingUri && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={handleStartRecording}
            >
              <Animated.View
                style={[
                  styles.recordButtonInner,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons name="mic" size={24} color={Colors.background.primary} />
              </Animated.View>
            </TouchableOpacity>
          )}

          {recordingState.isRecording && (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePauseResume}
              >
                <Ionicons
                  name={recordingState.isPaused ? 'play' : 'pause'}
                  size={20}
                  color={Colors.background.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStopRecording}
              >
                <Ionicons name="stop" size={20} color={Colors.background.primary} />
              </TouchableOpacity>
            </View>
          )}

          {recordingState.recordingUri && !recordingState.isRecording && (
            <View style={styles.previewControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePreviewPlay}
              >
                <Ionicons name="play" size={20} color={Colors.background.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.sendButton]}
                onPress={handleStopRecording}
              >
                <Ionicons name="send" size={20} color={Colors.background.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.primary,
    zIndex: 1000,
  },

  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl,
  },

  cancelButton: {
    alignSelf: 'flex-end',
    padding: Layout.spacing.sm,
  },

  recordingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Layout.spacing.xl,
  },

  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Layout.spacing.xs,
    height: 40,
  },

  waveBars: {
    width: 4,
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
  },

  duration: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },

  status: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  controls: {
    alignItems: 'center',
    paddingBottom: Layout.spacing.xl,
  },

  recordButton: {
    padding: Layout.spacing.lg,
  },

  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  recordingControls: {
    flexDirection: 'row',
    gap: Layout.spacing.xl,
  },

  previewControls: {
    flexDirection: 'row',
    gap: Layout.spacing.xl,
  },

  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  stopButton: {
    backgroundColor: Colors.error[500],
  },

  sendButton: {
    backgroundColor: Colors.success[500],
  },
});