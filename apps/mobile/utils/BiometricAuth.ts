import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from './storage';
import { errorHandler, AppError } from './errorHandling';

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'face_id',
  IRIS = 'iris',
  UNKNOWN = 'unknown',
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

export interface BiometricSettings {
  enabled: boolean;
  enrolledAt: string;
  lastUsed?: string;
  failureCount: number;
  lockedUntil?: string;
}

const BIOMETRIC_STORAGE_KEY = 'biometric_settings';
const MAX_FAILURE_COUNT = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

class BiometricAuthService {
  private settings: BiometricSettings | null = null;

  async initialize(): Promise<void> {
    try {
      this.settings = await secureStorage.get<BiometricSettings>(BIOMETRIC_STORAGE_KEY);
      if (!this.settings) {
        this.settings = {
          enabled: false,
          enrolledAt: new Date().toISOString(),
          failureCount: 0,
        };
        await this.saveSettings();
      }
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'BiometricAuth', action: 'initialize' });
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      await secureStorage.set(BIOMETRIC_STORAGE_KEY, this.settings);
    }
  }

  /**
   * Check if device supports biometric authentication
   */
  async isSupported(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  /**
   * Get available biometric types
   */
  async getAvailableTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricTypes: BiometricType[] = [];

      types.forEach(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            biometricTypes.push(BiometricType.FINGERPRINT);
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            biometricTypes.push(BiometricType.FACE_ID);
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            biometricTypes.push(BiometricType.IRIS);
            break;
          default:
            biometricTypes.push(BiometricType.UNKNOWN);
        }
      });

      return biometricTypes;
    } catch (error) {
      console.error('Error getting biometric types:', error);
      return [];
    }
  }

  /**
   * Get friendly name for biometric type
   */
  getBiometricTypeName(type: BiometricType): string {
    switch (type) {
      case BiometricType.FINGERPRINT:
        return 'Fingerprint';
      case BiometricType.FACE_ID:
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case BiometricType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  }

  /**
   * Check if biometric auth is currently locked due to failures
   */
  private isLocked(): boolean {
    if (!this.settings?.lockedUntil) return false;
    
    const lockTime = new Date(this.settings.lockedUntil).getTime();
    const now = Date.now();
    
    if (now < lockTime) {
      return true;
    }
    
    // Unlock if time has passed
    this.settings.lockedUntil = undefined;
    this.settings.failureCount = 0;
    this.saveSettings();
    return false;
  }

  /**
   * Handle authentication failure
   */
  private async handleFailure(): Promise<void> {
    if (!this.settings) return;

    this.settings.failureCount += 1;
    
    if (this.settings.failureCount >= MAX_FAILURE_COUNT) {
      this.settings.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
    }
    
    await this.saveSettings();
  }

  /**
   * Handle authentication success
   */
  private async handleSuccess(): Promise<void> {
    if (!this.settings) return;

    this.settings.failureCount = 0;
    this.settings.lockedUntil = undefined;
    this.settings.lastUsed = new Date().toISOString();
    
    await this.saveSettings();
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(options: {
    promptMessage?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  } = {}): Promise<BiometricResult> {
    await this.initialize();

    try {
      // Check if locked
      if (this.isLocked()) {
        const lockTime = new Date(this.settings!.lockedUntil!);
        const remaining = Math.ceil((lockTime.getTime() - Date.now()) / (60 * 1000));
        return {
          success: false,
          error: `Biometric authentication is locked. Try again in ${remaining} minutes.`,
        };
      }

      // Check if supported
      const isSupported = await this.isSupported();
      if (!isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device.',
        };
      }

      // Get available types for context
      const availableTypes = await this.getAvailableTypes();
      const primaryType = availableTypes[0] || BiometricType.UNKNOWN;

      // Perform authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || `Use ${this.getBiometricTypeName(primaryType)} to authenticate`,
        fallbackLabel: options.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: options.disableDeviceFallback || false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await this.handleSuccess();
        return {
          success: true,
          biometricType: primaryType,
        };
      } else {
        await this.handleFailure();
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }

    } catch (error) {
      await this.handleFailure();
      const appError = errorHandler.handle(error as Error, { 
        component: 'BiometricAuth', 
        action: 'authenticate' 
      });
      
      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable(): Promise<BiometricResult> {
    await this.initialize();

    const result = await this.authenticate({
      promptMessage: 'Enable biometric authentication for quick and secure access',
      disableDeviceFallback: false,
    });

    if (result.success && this.settings) {
      this.settings.enabled = true;
      this.settings.enrolledAt = new Date().toISOString();
      await this.saveSettings();
    }

    return result;
  }

  /**
   * Disable biometric authentication
   */
  async disable(): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings.enabled = false;
      this.settings.failureCount = 0;
      this.settings.lockedUntil = undefined;
      await this.saveSettings();
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isEnabled(): Promise<boolean> {
    await this.initialize();
    return this.settings?.enabled || false;
  }

  /**
   * Get biometric settings
   */
  async getSettings(): Promise<BiometricSettings | null> {
    await this.initialize();
    return this.settings;
  }

  /**
   * Reset failure count and unlock
   */
  async resetFailures(): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings.failureCount = 0;
      this.settings.lockedUntil = undefined;
      await this.saveSettings();
    }
  }

  /**
   * Get time remaining until unlock (in minutes)
   */
  getTimeUntilUnlock(): number {
    if (!this.settings?.lockedUntil) return 0;
    
    const lockTime = new Date(this.settings.lockedUntil).getTime();
    const now = Date.now();
    
    if (now >= lockTime) return 0;
    
    return Math.ceil((lockTime - now) / (60 * 1000));
  }
}

export const biometricAuth = new BiometricAuthService();

// Convenience functions
export const useBiometricAuth = () => {
  return {
    isSupported: () => biometricAuth.isSupported(),
    getAvailableTypes: () => biometricAuth.getAvailableTypes(),
    authenticate: (options?: Parameters<typeof biometricAuth.authenticate>[0]) => 
      biometricAuth.authenticate(options),
    enable: () => biometricAuth.enable(),
    disable: () => biometricAuth.disable(),
    isEnabled: () => biometricAuth.isEnabled(),
    getSettings: () => biometricAuth.getSettings(),
    resetFailures: () => biometricAuth.resetFailures(),
    getTimeUntilUnlock: () => biometricAuth.getTimeUntilUnlock(),
  };
};