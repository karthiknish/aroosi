import { Alert, AppState, AppStateStatus } from 'react-native';
import { secureStorage } from './storage';
import { biometricAuth } from './BiometricAuth';
import { errorHandler } from './errorHandling';

export interface AppLockSettings {
  enabled: boolean;
  requireAfterBackground: boolean;
  backgroundTimeout: number; // seconds
  enabledMethods: LockMethod[];
  lastActiveTime?: string;
  isLocked: boolean;
}

export enum LockMethod {
  BIOMETRIC = 'biometric',
  PASSCODE = 'passcode',
}

export interface UnlockResult {
  success: boolean;
  method?: LockMethod;
  error?: string;
}

const APP_LOCK_STORAGE_KEY = 'app_lock_settings';
const PASSCODE_STORAGE_KEY = 'app_passcode_hash';
const DEFAULT_BACKGROUND_TIMEOUT = 30; // 30 seconds

class AppLockService {
  private settings: AppLockSettings | null = null;
  private appStateSubscription: any = null;
  private backgroundTime: Date | null = null;
  private unlockCallbacks: ((result: UnlockResult) => void)[] = [];

  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      this.setupAppStateListener();
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'AppLockService', action: 'initialize' });
    }
  }

  private async loadSettings(): Promise<void> {
    this.settings = await secureStorage.get<AppLockSettings>(APP_LOCK_STORAGE_KEY);
    if (!this.settings) {
      this.settings = {
        enabled: false,
        requireAfterBackground: true,
        backgroundTimeout: DEFAULT_BACKGROUND_TIMEOUT,
        enabledMethods: [],
        isLocked: false,
      };
      await this.saveSettings();
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      await secureStorage.set(APP_LOCK_STORAGE_KEY, this.settings);
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (!this.settings?.enabled) return;

    switch (nextAppState) {
      case 'background':
        this.handleAppBackgrounded();
        break;
      case 'active':
        this.handleAppForegrounded();
        break;
    }
  }

  private handleAppBackgrounded(): void {
    this.backgroundTime = new Date();
    if (this.settings) {
      this.settings.lastActiveTime = new Date().toISOString();
      this.saveSettings();
    }
  }

  private async handleAppForegrounded(): Promise<void> {
    if (!this.settings?.requireAfterBackground || !this.backgroundTime) return;

    const backgroundDuration = (Date.now() - this.backgroundTime.getTime()) / 1000;
    
    if (backgroundDuration >= this.settings.backgroundTimeout) {
      await this.lockApp();
    }

    this.backgroundTime = null;
  }

  /**
   * Generate a simple hash for passcode (not cryptographically secure, but adds a layer)
   */
  private async hashPasscode(passcode: string): Promise<string> {
    // Simple hash - in production, use a proper hashing library
    let hash = 0;
    for (let i = 0; i < passcode.length; i++) {
      const char = passcode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Set up passcode for app lock
   */
  async setPasscode(passcode: string): Promise<boolean> {
    try {
      if (passcode.length < 4) {
        throw new Error('Passcode must be at least 4 digits');
      }

      const hashedPasscode = await this.hashPasscode(passcode);
      await secureStorage.set(PASSCODE_STORAGE_KEY, hashedPasscode);
      
      return true;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'AppLockService', action: 'setPasscode' });
      return false;
    }
  }

  /**
   * Verify passcode
   */
  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const storedHash = await secureStorage.get<string>(PASSCODE_STORAGE_KEY);
      if (!storedHash) return false;

      const inputHash = await this.hashPasscode(passcode);
      return inputHash === storedHash;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'AppLockService', action: 'verifyPasscode' });
      return false;
    }
  }

  /**
   * Enable app lock with specified methods
   */
  async enableAppLock(options: {
    methods: LockMethod[];
    requireAfterBackground?: boolean;
    backgroundTimeout?: number;
    passcode?: string;
  }): Promise<boolean> {
    try {
      await this.initialize();

      // Validate methods
      if (options.methods.includes(LockMethod.BIOMETRIC)) {
        const biometricSupported = await biometricAuth.isSupported();
        if (!biometricSupported) {
          throw new Error('Biometric authentication is not available on this device');
        }
      }

      if (options.methods.includes(LockMethod.PASSCODE)) {
        if (!options.passcode) {
          throw new Error('Passcode is required when enabling passcode method');
        }
        const passcodeSet = await this.setPasscode(options.passcode);
        if (!passcodeSet) {
          throw new Error('Failed to set passcode');
        }
      }

      // Update settings
      if (this.settings) {
        this.settings.enabled = true;
        this.settings.enabledMethods = options.methods;
        this.settings.requireAfterBackground = options.requireAfterBackground ?? true;
        this.settings.backgroundTimeout = options.backgroundTimeout ?? DEFAULT_BACKGROUND_TIMEOUT;
        await this.saveSettings();
      }

      return true;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'AppLockService', action: 'enableAppLock' });
      return false;
    }
  }

  /**
   * Disable app lock
   */
  async disableAppLock(): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings.enabled = false;
      this.settings.isLocked = false;
      this.settings.enabledMethods = [];
      await this.saveSettings();
    }

    // Clear stored passcode
    await secureStorage.remove(PASSCODE_STORAGE_KEY);
  }

  /**
   * Lock the app manually
   */
  async lockApp(): Promise<void> {
    await this.initialize();
    
    if (this.settings?.enabled) {
      this.settings.isLocked = true;
      await this.saveSettings();
    }
  }

  /**
   * Attempt to unlock the app
   */
  async unlockApp(method: LockMethod, input?: string): Promise<UnlockResult> {
    await this.initialize();

    if (!this.settings?.enabled || !this.settings.isLocked) {
      return { success: true };
    }

    if (!this.settings.enabledMethods.includes(method)) {
      return { 
        success: false, 
        error: 'This unlock method is not enabled' 
      };
    }

    try {
      let unlockSuccessful = false;

      switch (method) {
        case LockMethod.BIOMETRIC:
          const biometricResult = await biometricAuth.authenticate({
            promptMessage: 'Unlock Aroosi',
            disableDeviceFallback: false,
          });
          unlockSuccessful = biometricResult.success;
          if (!unlockSuccessful && biometricResult.error) {
            return { success: false, error: biometricResult.error };
          }
          break;

        case LockMethod.PASSCODE:
          if (!input) {
            return { success: false, error: 'Passcode is required' };
          }
          unlockSuccessful = await this.verifyPasscode(input);
          if (!unlockSuccessful) {
            return { success: false, error: 'Incorrect passcode' };
          }
          break;

        default:
          return { success: false, error: 'Unknown unlock method' };
      }

      if (unlockSuccessful) {
        this.settings.isLocked = false;
        await this.saveSettings();
        
        // Notify callbacks
        this.unlockCallbacks.forEach(callback => 
          callback({ success: true, method })
        );
        
        return { success: true, method };
      }

      return { success: false, error: 'Authentication failed' };

    } catch (error) {
      const appError = errorHandler.handle(error as Error, { 
        component: 'AppLockService', 
        action: 'unlockApp' 
      });
      return { success: false, error: appError.userMessage };
    }
  }

  /**
   * Check if app is currently locked
   */
  async isLocked(): Promise<boolean> {
    await this.initialize();
    return this.settings?.isLocked || false;
  }

  /**
   * Check if app lock is enabled
   */
  async isEnabled(): Promise<boolean> {
    await this.initialize();
    return this.settings?.enabled || false;
  }

  /**
   * Get current app lock settings
   */
  async getSettings(): Promise<AppLockSettings | null> {
    await this.initialize();
    return this.settings;
  }

  /**
   * Add callback for unlock events
   */
  addUnlockCallback(callback: (result: UnlockResult) => void): void {
    this.unlockCallbacks.push(callback);
  }

  /**
   * Remove unlock callback
   */
  removeUnlockCallback(callback: (result: UnlockResult) => void): void {
    const index = this.unlockCallbacks.indexOf(callback);
    if (index > -1) {
      this.unlockCallbacks.splice(index, 1);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.unlockCallbacks = [];
  }

  /**
   * Update background timeout
   */
  async updateBackgroundTimeout(seconds: number): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings.backgroundTimeout = seconds;
      await this.saveSettings();
    }
  }

  /**
   * Show app lock screen with available methods
   */
  async showUnlockPrompt(): Promise<UnlockResult> {
    await this.initialize();

    if (!this.settings?.enabled || !this.settings.enabledMethods.length) {
      return { success: true };
    }

    // Try biometric first if available
    if (this.settings.enabledMethods.includes(LockMethod.BIOMETRIC)) {
      const biometricResult = await this.unlockApp(LockMethod.BIOMETRIC);
      if (biometricResult.success) {
        return biometricResult;
      }
    }

    // If biometric fails or not available, and passcode is enabled, show passcode prompt
    if (this.settings.enabledMethods.includes(LockMethod.PASSCODE)) {
      return new Promise((resolve) => {
        Alert.prompt(
          'App Locked',
          'Enter your passcode to unlock Aroosi',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({ success: false, error: 'Cancelled by user' }),
            },
            {
              text: 'Unlock',
              onPress: async (passcode) => {
                if (passcode) {
                  const result = await this.unlockApp(LockMethod.PASSCODE, passcode);
                  resolve(result);
                } else {
                  resolve({ success: false, error: 'Passcode is required' });
                }
              },
            },
          ],
          'secure-text'
        );
      });
    }

    return { success: false, error: 'No unlock methods available' };
  }
}

export const appLockService = new AppLockService();

// Hook for easy use in components
export const useAppLock = () => {
  return {
    enableAppLock: (options: Parameters<typeof appLockService.enableAppLock>[0]) =>
      appLockService.enableAppLock(options),
    disableAppLock: () => appLockService.disableAppLock(),
    lockApp: () => appLockService.lockApp(),
    unlockApp: (method: LockMethod, input?: string) => 
      appLockService.unlockApp(method, input),
    isLocked: () => appLockService.isLocked(),
    isEnabled: () => appLockService.isEnabled(),
    getSettings: () => appLockService.getSettings(),
    showUnlockPrompt: () => appLockService.showUnlockPrompt(),
    updateBackgroundTimeout: (seconds: number) => 
      appLockService.updateBackgroundTimeout(seconds),
  };
};