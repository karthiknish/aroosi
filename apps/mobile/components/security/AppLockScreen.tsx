import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Layout } from '../../constants';
import { useAppLock, LockMethod } from '../../utils/AppLockService';
import { useBiometricAuth } from '../../utils/BiometricAuth';
import PlatformHaptics from '../../utils/PlatformHaptics';

const { width, height } = Dimensions.get('window');

interface AppLockScreenProps {
  visible: boolean;
  onUnlock: () => void;
}

export default function AppLockScreen({ visible, onUnlock }: AppLockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [shakeAnimation] = useState(new Animated.Value(0));

  const appLock = useAppLock();
  const biometricAuth = useBiometricAuth();

  useEffect(() => {
    if (visible) {
      loadSettings();
      tryBiometricAuth();
    }
  }, [visible]);

  useEffect(() => {
    if (isLocked && lockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLocked, lockTimeRemaining]);

  const loadSettings = async () => {
    try {
      const appLockSettings = await appLock.getSettings();
      setSettings(appLockSettings);
    } catch (error) {
      console.error('Failed to load app lock settings:', error);
    }
  };

  const tryBiometricAuth = async () => {
    if (!settings?.enabledMethods?.includes(LockMethod.BIOMETRIC)) return;

    try {
      const result = await biometricAuth.authenticate({
        promptMessage: 'Unlock Aroosi',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await handleSuccessfulUnlock(LockMethod.BIOMETRIC);
      }
    } catch (error) {
      // Biometric failed, show passcode input
      console.log('Biometric authentication failed:', error);
    }
  };

  const handleSuccessfulUnlock = async (method: LockMethod) => {
    try {
      const result = await appLock.unlockApp(method, method === LockMethod.PASSCODE ? passcode : undefined);
      
      if (result.success) {
        await PlatformHaptics.success();
        setPasscode('');
        setAttempts(0);
        setIsLocked(false);
        onUnlock();
      } else {
        await handleFailedAttempt();
      }
    } catch (error) {
      await handleFailedAttempt();
    }
  };

  const handleFailedAttempt = async () => {
    await PlatformHaptics.error();
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setPasscode('');

    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    // Lock after 5 failed attempts
    if (newAttempts >= 5) {
      setIsLocked(true);
      setLockTimeRemaining(300); // 5 minutes
      Alert.alert(
        'Too Many Attempts',
        'You have made too many failed attempts. Please wait 5 minutes before trying again.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Incorrect Passcode',
        `${5 - newAttempts} attempts remaining`,
        [{ text: 'Try Again' }]
      );
    }
  };

  const handlePasscodeInput = (digit: string) => {
    if (isLocked) return;

    const newPasscode = passcode + digit;
    setPasscode(newPasscode);

    if (newPasscode.length === 4) {
      // Auto-submit when 4 digits are entered
      setTimeout(() => {
        handleSuccessfulUnlock(LockMethod.PASSCODE);
      }, 100);
    }
  };

  const handleBackspace = () => {
    setPasscode(prev => prev.slice(0, -1));
  };

  const retryBiometric = async () => {
    if (settings?.enabledMethods?.includes(LockMethod.BIOMETRIC)) {
      await tryBiometricAuth();
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <BlurView intensity={50} style={styles.blurContainer}>
        <View style={styles.content}>
          {/* App Logo/Title */}
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={60} color={Colors.primary[500]} />
            <Text style={styles.title}>Aroosi</Text>
            <Text style={styles.subtitle}>Enter your passcode to continue</Text>
          </View>

          {/* Passcode Display */}
          <Animated.View 
            style={[
              styles.passcodeContainer,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            {[0, 1, 2, 3].map(index => (
              <View
                key={index}
                style={[
                  styles.passcodeDot,
                  passcode.length > index && styles.passcodeDotFilled,
                ]}
              />
            ))}
          </Animated.View>

          {/* Lock Status */}
          {isLocked && (
            <View style={styles.lockStatus}>
              <Ionicons name="time-outline" size={24} color={Colors.error[500]} />
              <Text style={styles.lockText}>
                Try again in {formatTime(lockTimeRemaining)}
              </Text>
            </View>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'backspace'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) => {
                  if (key === '') {
                    return <View key={keyIndex} style={styles.keypadButton} />;
                  }

                  if (key === 'backspace') {
                    return (
                      <TouchableOpacity
                        key={keyIndex}
                        style={styles.keypadButton}
                        onPress={handleBackspace}
                        disabled={isLocked}
                      >
                        <Ionicons name="backspace-outline" size={24} color={Colors.text.primary} />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={styles.keypadButton}
                      onPress={() => handlePasscodeInput(key)}
                      disabled={isLocked}
                    >
                      <Text style={styles.keypadButtonText}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Biometric Button */}
          {settings?.enabledMethods?.includes(LockMethod.BIOMETRIC) && !isLocked && (
            <TouchableOpacity style={styles.biometricButton} onPress={retryBiometric}>
              <Ionicons name="finger-print" size={24} color={Colors.primary[500]} />
              <Text style={styles.biometricButtonText}>Use Biometric</Text>
            </TouchableOpacity>
          )}

          {/* Attempts Warning */}
          {attempts > 0 && !isLocked && (
            <Text style={styles.attemptsText}>
              {5 - attempts} attempts remaining
            </Text>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },

  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },

  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xxl,
  },

  title: {
    fontSize: Layout.typography.fontSize.xxl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.md,
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.sm,
    textAlign: 'center',
  },

  passcodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xxl,
    width: 120,
  },

  passcodeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.neutral[400],
    backgroundColor: 'transparent',
  },

  passcodeDotFilled: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },

  lockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.error[100],
    borderRadius: Layout.radius.md,
  },

  lockText: {
    marginLeft: Layout.spacing.sm,
    color: Colors.error[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  keypad: {
    width: Math.min(width * 0.8, 300),
  },

  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },

  keypadButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  keypadButtonText: {
    fontSize: 24,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },

  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.primary[100],
    borderRadius: Layout.radius.md,
  },

  biometricButtonText: {
    marginLeft: Layout.spacing.sm,
    color: Colors.primary[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  attemptsText: {
    marginTop: Layout.spacing.lg,
    color: Colors.error[500],
    fontSize: Layout.typography.fontSize.sm,
    textAlign: 'center',
  },
});