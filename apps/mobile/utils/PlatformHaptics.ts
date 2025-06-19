import { Platform, Vibration } from 'react-native';

export enum HapticFeedbackType {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Selection = 'selection',
  ImpactLight = 'impactLight',
  ImpactMedium = 'impactMedium',
  ImpactHeavy = 'impactHeavy',
  NotificationSuccess = 'notificationSuccess',
  NotificationWarning = 'notificationWarning',
  NotificationError = 'notificationError',
}

class PlatformHaptics {
  private static isHapticsEnabled = true;
  
  static setEnabled(enabled: boolean) {
    PlatformHaptics.isHapticsEnabled = enabled;
  }

  static async trigger(type: HapticFeedbackType) {
    if (!PlatformHaptics.isHapticsEnabled) return;

    if (Platform.OS === 'ios') {
      await PlatformHaptics.triggerIOS(type);
    } else if (Platform.OS === 'android') {
      PlatformHaptics.triggerAndroid(type);
    }
  }

  private static async triggerIOS(type: HapticFeedbackType) {
    try {
      // @ts-expect-error - Expo Haptics
      const { Haptics } = require('expo-haptics');
      
      switch (type) {
        case HapticFeedbackType.Light:
        case HapticFeedbackType.ImpactLight:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
          
        case HapticFeedbackType.Medium:
        case HapticFeedbackType.ImpactMedium:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
          
        case HapticFeedbackType.Heavy:
        case HapticFeedbackType.ImpactHeavy:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
          
        case HapticFeedbackType.Success:
        case HapticFeedbackType.NotificationSuccess:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
          
        case HapticFeedbackType.Warning:
        case HapticFeedbackType.NotificationWarning:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
          
        case HapticFeedbackType.Error:
        case HapticFeedbackType.NotificationError:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
          
        case HapticFeedbackType.Selection:
          await Haptics.selectionAsync();
          break;
          
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  private static triggerAndroid(type: HapticFeedbackType) {
    try {
      const patterns = PlatformHaptics.getAndroidVibrationPattern(type);
      
      if (patterns.length === 1) {
        Vibration.vibrate(patterns[0]);
      } else {
        Vibration.vibrate(patterns);
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }

  private static getAndroidVibrationPattern(type: HapticFeedbackType): number[] {
    switch (type) {
      case HapticFeedbackType.Light:
      case HapticFeedbackType.ImpactLight:
      case HapticFeedbackType.Selection:
        return [10];
        
      case HapticFeedbackType.Medium:
      case HapticFeedbackType.ImpactMedium:
        return [25];
        
      case HapticFeedbackType.Heavy:
      case HapticFeedbackType.ImpactHeavy:
        return [50];
        
      case HapticFeedbackType.Success:
      case HapticFeedbackType.NotificationSuccess:
        return [0, 50, 50, 50];
        
      case HapticFeedbackType.Warning:
      case HapticFeedbackType.NotificationWarning:
        return [0, 100, 50, 100];
        
      case HapticFeedbackType.Error:
      case HapticFeedbackType.NotificationError:
        return [0, 200, 100, 200, 100, 200];
        
      default:
        return [10];
    }
  }

  // Convenience methods for common use cases
  static light() {
    return PlatformHaptics.trigger(HapticFeedbackType.Light);
  }

  static medium() {
    return PlatformHaptics.trigger(HapticFeedbackType.Medium);
  }

  static heavy() {
    return PlatformHaptics.trigger(HapticFeedbackType.Heavy);
  }

  static success() {
    return PlatformHaptics.trigger(HapticFeedbackType.Success);
  }

  static warning() {
    return PlatformHaptics.trigger(HapticFeedbackType.Warning);
  }

  static error() {
    return PlatformHaptics.trigger(HapticFeedbackType.Error);
  }

  static selection() {
    return PlatformHaptics.trigger(HapticFeedbackType.Selection);
  }
}

export default PlatformHaptics;