import { Platform, DeviceEventEmitter } from 'react-native';
import * as Device from 'expo-device';
import { secureStorage } from './storage';
import { errorHandler, AppError } from './errorHandling';
import { errorReporter } from './ErrorReporter';

export interface SecurityThreat {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  description: string;
  timestamp: number;
  deviceInfo: {
    isEmulator: boolean;
    isRooted: boolean;
    hasXposed: boolean;
    hasHooks: boolean;
  };
  location?: string;
  resolved: boolean;
}

export enum ThreatType {
  ROOTED_DEVICE = 'rooted_device',
  EMULATOR_DETECTED = 'emulator_detected',
  DEBUGGER_ATTACHED = 'debugger_attached',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  TAMPERING_DETECTED = 'tampering_detected',
  NETWORK_SECURITY = 'network_security',
  MALWARE_DETECTED = 'malware_detected',
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecuritySettings {
  monitoringEnabled: boolean;
  blockRootedDevices: boolean;
  blockEmulators: boolean;
  blockDebugging: boolean;
  threatNotifications: boolean;
  automaticBlocking: boolean;
  allowTestDevices: boolean;
}

const SECURITY_THREATS_STORAGE = 'security_threats';
const SECURITY_SETTINGS_STORAGE = 'security_settings';
const DEVICE_FINGERPRINT_STORAGE = 'device_fingerprint';

class SecurityMonitorService {
  private settings: SecuritySettings | null = null;
  private threats: SecurityThreat[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private deviceFingerprint: string | null = null;

  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      await this.loadThreats();
      await this.generateDeviceFingerprint();
      
      if (this.settings?.monitoringEnabled) {
        await this.startMonitoring();
      }
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'SecurityMonitor', action: 'initialize' });
    }
  }

  private async loadSettings(): Promise<void> {
    this.settings = await secureStorage.get<SecuritySettings>(SECURITY_SETTINGS_STORAGE);
    if (!this.settings) {
      this.settings = {
        monitoringEnabled: true,
        blockRootedDevices: true,
        blockEmulators: true,
        blockDebugging: __DEV__ ? false : true,
        threatNotifications: true,
        automaticBlocking: false,
        allowTestDevices: __DEV__,
      };
      await this.saveSettings();
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      await secureStorage.set(SECURITY_SETTINGS_STORAGE, this.settings);
    }
  }

  private async loadThreats(): Promise<void> {
    this.threats = await secureStorage.get<SecurityThreat[]>(SECURITY_THREATS_STORAGE) || [];
  }

  private async saveThreats(): Promise<void> {
    await secureStorage.set(SECURITY_THREATS_STORAGE, this.threats);
  }

  private async generateDeviceFingerprint(): Promise<void> {
    try {
      const deviceName = Device.deviceName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      const brand = Device.brand || 'unknown';
      const modelName = Device.modelName || 'unknown';

      this.deviceFingerprint = `${brand}-${modelName}-${osVersion}-${Date.now()}`;
      await secureStorage.set(DEVICE_FINGERPRINT_STORAGE, this.deviceFingerprint);
    } catch (error) {
      console.warn('Failed to generate device fingerprint:', error);
    }
  }

  /**
   * Start security monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) return;

    // Initial security check
    await this.performSecurityChecks();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performSecurityChecks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop security monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform comprehensive security checks
   */
  private async performSecurityChecks(): Promise<void> {
    try {
      const deviceInfo = {
        isEmulator: await this.checkEmulator(),
        isRooted: await this.checkRootAccess(),
        hasXposed: await this.checkXposedFramework(),
        hasHooks: await this.checkHooks(),
      };

      // Check for rooted device
      if (deviceInfo.isRooted && this.settings?.blockRootedDevices) {
        await this.reportThreat({
          type: ThreatType.ROOTED_DEVICE,
          severity: ThreatSeverity.HIGH,
          description: 'Device appears to be rooted or jailbroken',
          deviceInfo,
        });
      }

      // Check for emulator
      if (deviceInfo.isEmulator && this.settings?.blockEmulators) {
        await this.reportThreat({
          type: ThreatType.EMULATOR_DETECTED,
          severity: ThreatSeverity.MEDIUM,
          description: 'App is running on an emulator',
          deviceInfo,
        });
      }

      // Check for debugging
      if (await this.checkDebugging() && this.settings?.blockDebugging) {
        await this.reportThreat({
          type: ThreatType.DEBUGGER_ATTACHED,
          severity: ThreatSeverity.HIGH,
          description: 'Debugger is attached to the application',
          deviceInfo,
        });
      }

      // Check for tampering
      if (await this.checkTampering()) {
        await this.reportThreat({
          type: ThreatType.TAMPERING_DETECTED,
          severity: ThreatSeverity.CRITICAL,
          description: 'Application tampering detected',
          deviceInfo,
        });
      }

    } catch (error) {
      errorHandler.handle(error as Error, { component: 'SecurityMonitor', action: 'performSecurityChecks' });
    }
  }

  /**
   * Check if device is rooted/jailbroken
   */
  private async checkRootAccess(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Check for common root indicators on Android
        const rootIndicators = [
          '/system/app/Superuser.apk',
          '/sbin/su',
          '/system/bin/su',
          '/system/xbin/su',
          '/data/local/xbin/su',
          '/data/local/bin/su',
          '/system/sd/xbin/su',
          '/system/bin/failsafe/su',
          '/data/local/su',
        ];

        // In a real implementation, you would use a native module
        // to check for these files securely
        return false; // Placeholder
      } else {
        // Check for jailbreak indicators on iOS
        const jailbreakIndicators = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
        ];

        // In a real implementation, you would use a native module
        return false; // Placeholder
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if running on emulator
   */
  private async checkEmulator(): Promise<boolean> {
    try {
      return !Device.isDevice;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for Xposed Framework (Android)
   */
  private async checkXposedFramework(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // Check for Xposed indicators
      // In a real implementation, you would use native checks
      return false; // Placeholder
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for runtime manipulation/hooks
   */
  private async checkHooks(): Promise<boolean> {
    try {
      // Check for common hooking frameworks
      // In a real implementation, you would use native checks
      return false; // Placeholder
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if debugger is attached
   */
  private async checkDebugging(): Promise<boolean> {
    try {
      // Simple debugging detection
      const start = Date.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = Date.now();
      
      // If debugger paused execution, this will take longer
      return (end - start) > 100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for application tampering
   */
  private async checkTampering(): Promise<boolean> {
    try {
      // Check application signature and integrity
      // In a real implementation, you would verify:
      // - App signature
      // - File checksums
      // - Bundle integrity
      return false; // Placeholder
    } catch (error) {
      return false;
    }
  }

  /**
   * Report a security threat
   */
  private async reportThreat(threatData: {
    type: ThreatType;
    severity: ThreatSeverity;
    description: string;
    deviceInfo: any;
    location?: string;
  }): Promise<void> {
    const threat: SecurityThreat = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...threatData,
    };

    this.threats.push(threat);
    await this.saveThreats();

    // Report to error tracking
    await errorReporter.reportError(
      new AppError(
        `Security threat detected: ${threat.description}`,
        'unknown',
        { threat, securityEvent: true },
        false
      ),
      { securityThreat: threat }
    );

    // Emit event for UI components
    DeviceEventEmitter.emit('securityThreatDetected', threat);

    // Take automatic action if enabled
    if (this.settings?.automaticBlocking && threat.severity === ThreatSeverity.CRITICAL) {
      await this.handleCriticalThreat(threat);
    }
  }

  /**
   * Handle critical security threats
   */
  private async handleCriticalThreat(threat: SecurityThreat): Promise<void> {
    // In a real implementation, you might:
    // - Lock the app
    // - Clear sensitive data
    // - Notify the server
    // - Log the user out
    
    console.warn('Critical security threat detected:', threat);
  }

  /**
   * Get all detected threats
   */
  async getThreats(): Promise<SecurityThreat[]> {
    await this.loadThreats();
    return [...this.threats];
  }

  /**
   * Get active (unresolved) threats
   */
  async getActiveThreats(): Promise<SecurityThreat[]> {
    await this.loadThreats();
    return this.threats.filter(threat => !threat.resolved);
  }

  /**
   * Mark threat as resolved
   */
  async resolveThreat(threatId: string): Promise<void> {
    const threat = this.threats.find(t => t.id === threatId);
    if (threat) {
      threat.resolved = true;
      await this.saveThreats();
    }
  }

  /**
   * Clear all threats
   */
  async clearThreats(): Promise<void> {
    this.threats = [];
    await this.saveThreats();
  }

  /**
   * Update security settings
   */
  async updateSettings(newSettings: Partial<SecuritySettings>): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();

      // Restart monitoring if settings changed
      if (newSettings.monitoringEnabled !== undefined) {
        this.stopMonitoring();
        if (this.settings.monitoringEnabled) {
          await this.startMonitoring();
        }
      }
    }
  }

  /**
   * Get current security settings
   */
  async getSettings(): Promise<SecuritySettings | null> {
    await this.initialize();
    return this.settings;
  }

  /**
   * Check if device is secure enough to use the app
   */
  async isDeviceSecure(): Promise<{ secure: boolean; reasons: string[] }> {
    const threats = await this.getActiveThreats();
    const reasons: string[] = [];

    const criticalThreats = threats.filter(t => 
      t.severity === ThreatSeverity.CRITICAL || t.severity === ThreatSeverity.HIGH
    );

    if (criticalThreats.length > 0) {
      reasons.push(...criticalThreats.map(t => t.description));
    }

    return {
      secure: criticalThreats.length === 0,
      reasons,
    };
  }

  /**
   * Get device fingerprint
   */
  async getDeviceFingerprint(): Promise<string | null> {
    if (!this.deviceFingerprint) {
      await this.generateDeviceFingerprint();
    }
    return this.deviceFingerprint;
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<{
    deviceInfo: any;
    threats: SecurityThreat[];
    settings: SecuritySettings | null;
    deviceFingerprint: string | null;
    timestamp: number;
  }> {
    const deviceInfo = {
      isEmulator: await this.checkEmulator(),
      isRooted: await this.checkRootAccess(),
      hasXposed: await this.checkXposedFramework(),
      hasHooks: await this.checkHooks(),
      deviceId: this.deviceFingerprint || 'unknown',
      systemVersion: Device.osVersion || 'unknown',
      appVersion: '1.0.0', // You might want to get this from app.json
    };

    return {
      deviceInfo,
      threats: await this.getThreats(),
      settings: await this.getSettings(),
      deviceFingerprint: await this.getDeviceFingerprint(),
      timestamp: Date.now(),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
  }
}

export const securityMonitor = new SecurityMonitorService();

// Hook for easy use in components
export const useSecurityMonitor = () => {
  return {
    initialize: () => securityMonitor.initialize(),
    startMonitoring: () => securityMonitor.startMonitoring(),
    stopMonitoring: () => securityMonitor.stopMonitoring(),
    getThreats: () => securityMonitor.getThreats(),
    getActiveThreats: () => securityMonitor.getActiveThreats(),
    resolveThreat: (threatId: string) => securityMonitor.resolveThreat(threatId),
    clearThreats: () => securityMonitor.clearThreats(),
    updateSettings: (settings: Partial<SecuritySettings>) => 
      securityMonitor.updateSettings(settings),
    getSettings: () => securityMonitor.getSettings(),
    isDeviceSecure: () => securityMonitor.isDeviceSecure(),
    getDeviceFingerprint: () => securityMonitor.getDeviceFingerprint(),
    generateSecurityReport: () => securityMonitor.generateSecurityReport(),
  };
};