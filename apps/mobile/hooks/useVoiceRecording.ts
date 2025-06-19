import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import PlatformHaptics from '../utils/PlatformHaptics';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in milliseconds
  recordingUri: string | null;
  isPermissionGranted: boolean;
}

export interface UseVoiceRecordingResult {
  // State
  recordingState: VoiceRecordingState;
  
  // Actions
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  
  // Permissions
  requestPermissions: () => Promise<boolean>;
  
  // Playback for preview
  playRecording: (uri: string) => Promise<void>;
  stopPlayback: () => Promise<void>;
}

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export function useVoiceRecording(): UseVoiceRecordingResult {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordingUri: null,
    isPermissionGranted: false,
  });

  const recording = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Request audio permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to record voice messages.',
          [{ text: 'OK' }]
        );
        return false;
      }

      setRecordingState(prev => ({ ...prev, isPermissionGranted: true }));
      return true;
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Check permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create new recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS
      );
      
      recording.current = newRecording;

      // Start duration tracking
      const startTime = Date.now();
      durationInterval.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - startTime,
        }));
      }, 100);

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        recordingUri: null,
      }));

      // Haptic feedback
      await PlatformHaptics.light();

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      return false;
    }
  }, [requestPermissions]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recording.current) {
        return null;
      }

      // Stop duration tracking
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop recording
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        recordingUri: uri,
      }));

      // Haptic feedback
      await PlatformHaptics.success();

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }, []);

  // Pause recording
  const pauseRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recording.current) {
        return;
      }

      await recording.current.pauseAsync();
      
      // Pause duration tracking
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setRecordingState(prev => ({
        ...prev,
        isPaused: true,
      }));

      await PlatformHaptics.light();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recording.current) {
        return;
      }

      await recording.current.startAsync();

      // Resume duration tracking
      const currentDuration = recordingState.duration;
      const resumeTime = Date.now() - currentDuration;
      
      durationInterval.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - resumeTime,
        }));
      }, 100);

      setRecordingState(prev => ({
        ...prev,
        isPaused: false,
      }));

      await PlatformHaptics.light();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }, [recordingState.duration]);

  // Cancel recording
  const cancelRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recording.current) {
        return;
      }

      // Stop duration tracking
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop and unload recording
      await recording.current.stopAndUnloadAsync();
      recording.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        recordingUri: null,
        isPermissionGranted: recordingState.isPermissionGranted,
      });

      await PlatformHaptics.warning();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }, [recordingState.isPermissionGranted]);

  // Play recording for preview
  const playRecording = useCallback(async (uri: string): Promise<void> => {
    try {
      // Stop any existing playback
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }

      // Create and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      sound.current = newSound;

      // Set completion callback
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          stopPlayback();
        }
      });

      await PlatformHaptics.light();
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  }, []);

  // Stop playback
  const stopPlayback = useCallback(async (): Promise<void> => {
    try {
      if (sound.current) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
        sound.current = null;
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (recording.current) {
        recording.current.stopAndUnloadAsync();
      }
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermissions,
    playRecording,
    stopPlayback,
  };
}