import { Platform, Alert, Linking } from 'react-native';

export enum PermissionType {
  Camera = 'camera',
  MediaLibrary = 'mediaLibrary',
  Notifications = 'notifications',
  Location = 'location',
  LocationForeground = 'locationForeground',
  LocationBackground = 'locationBackground',
  Contacts = 'contacts',
}

export enum PermissionStatus {
  Granted = 'granted',
  Denied = 'denied',
  Undetermined = 'undetermined',
  Restricted = 'restricted', // iOS only
}

export interface PermissionResult {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

class PlatformPermissions {
  private static permissionModules: any = {};

  private static async getPermissionModule(type: PermissionType) {
    try {
      switch (type) {
        case PermissionType.Camera:
        case PermissionType.MediaLibrary:
          if (!PlatformPermissions.permissionModules.ImagePicker) {
            // @ts-expect-error - Expo ImagePicker
            PlatformPermissions.permissionModules.ImagePicker = require('expo-image-picker');
          }
          return PlatformPermissions.permissionModules.ImagePicker;

        case PermissionType.Notifications:
          if (!PlatformPermissions.permissionModules.Notifications) {
            // @ts-expect-error - Expo Notifications
            PlatformPermissions.permissionModules.Notifications = require('expo-notifications');
          }
          return PlatformPermissions.permissionModules.Notifications;

        case PermissionType.Location:
        case PermissionType.LocationForeground:
        case PermissionType.LocationBackground:
          if (!PlatformPermissions.permissionModules.Location) {
            // @ts-expect-error - Expo Location
            PlatformPermissions.permissionModules.Location = require('expo-location');
          }
          return PlatformPermissions.permissionModules.Location;

        case PermissionType.Contacts:
          if (!PlatformPermissions.permissionModules.Contacts) {
            // @ts-expect-error - Expo Contacts
            PlatformPermissions.permissionModules.Contacts = require('expo-contacts');
          }
          return PlatformPermissions.permissionModules.Contacts;

        default:
          throw new Error(`Unsupported permission type: ${type}`);
      }
    } catch (error) {
      console.warn(`Failed to load permission module for ${type}:`, error);
      return null;
    }
  }

  static async checkPermission(type: PermissionType): Promise<PermissionResult> {
    try {
      const module = await PlatformPermissions.getPermissionModule(type);
      if (!module) {
        return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
      }

      let result;
      switch (type) {
        case PermissionType.Camera:
          result = await module.getCameraPermissionsAsync();
          break;
        case PermissionType.MediaLibrary:
          result = await module.getMediaLibraryPermissionsAsync();
          break;
        case PermissionType.Notifications:
          result = await module.getPermissionsAsync();
          break;
        case PermissionType.Location:
        case PermissionType.LocationForeground:
          result = await module.getForegroundPermissionsAsync();
          break;
        case PermissionType.LocationBackground:
          result = await module.getBackgroundPermissionsAsync();
          break;
        case PermissionType.Contacts:
          result = await module.getPermissionsAsync();
          break;
        default:
          return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
      }

      return PlatformPermissions.parsePermissionResult(result);
    } catch (error) {
      console.error(`Failed to check ${type} permission:`, error);
      return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
    }
  }

  static async requestPermission(type: PermissionType): Promise<PermissionResult> {
    try {
      const module = await PlatformPermissions.getPermissionModule(type);
      if (!module) {
        return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
      }

      let result;
      switch (type) {
        case PermissionType.Camera:
          result = await module.requestCameraPermissionsAsync();
          break;
        case PermissionType.MediaLibrary:
          result = await module.requestMediaLibraryPermissionsAsync();
          break;
        case PermissionType.Notifications:
          result = await module.requestPermissionsAsync();
          break;
        case PermissionType.Location:
        case PermissionType.LocationForeground:
          result = await module.requestForegroundPermissionsAsync();
          break;
        case PermissionType.LocationBackground:
          result = await module.requestBackgroundPermissionsAsync();
          break;
        case PermissionType.Contacts:
          result = await module.requestPermissionsAsync();
          break;
        default:
          return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
      }

      return PlatformPermissions.parsePermissionResult(result);
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      return { status: PermissionStatus.Denied, granted: false, canAskAgain: false };
    }
  }

  private static parsePermissionResult(result: any): PermissionResult {
    const status = result.status as PermissionStatus;
    const granted = status === PermissionStatus.Granted;
    const canAskAgain = result.canAskAgain !== false && status !== PermissionStatus.Restricted;

    return { status, granted, canAskAgain };
  }

  static async requestWithRationale(
    type: PermissionType,
    rationale: {
      title: string;
      message: string;
      buttonPositive?: string;
      buttonNegative?: string;
    }
  ): Promise<PermissionResult> {
    // First check if we already have permission
    const currentStatus = await PlatformPermissions.checkPermission(type);
    if (currentStatus.granted) {
      return currentStatus;
    }

    // If we can't ask again, show settings alert
    if (!currentStatus.canAskAgain) {
      PlatformPermissions.showSettingsAlert(type, rationale);
      return currentStatus;
    }

    // Show rationale on Android, iOS handles this automatically
    if (Platform.OS === 'android') {
      return new Promise((resolve) => {
        Alert.alert(
          rationale.title,
          rationale.message,
          [
            {
              text: rationale.buttonNegative || 'Cancel',
              style: 'cancel',
              onPress: () => resolve(currentStatus),
            },
            {
              text: rationale.buttonPositive || 'Grant Permission',
              onPress: async () => {
                const result = await PlatformPermissions.requestPermission(type);
                resolve(result);
              },
            },
          ],
          { cancelable: false }
        );
      });
    }

    // iOS - request directly
    return PlatformPermissions.requestPermission(type);
  }

  private static showSettingsAlert(type: PermissionType, rationale: { title: string; message: string }) {
    const permissionName = PlatformPermissions.getPermissionDisplayName(type);
    
    Alert.alert(
      `${permissionName} Permission Required`,
      `${rationale.message}\n\nPlease enable ${permissionName} permission in Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  private static getPermissionDisplayName(type: PermissionType): string {
    switch (type) {
      case PermissionType.Camera:
        return 'Camera';
      case PermissionType.MediaLibrary:
        return 'Photo Library';
      case PermissionType.Notifications:
        return 'Notifications';
      case PermissionType.Location:
      case PermissionType.LocationForeground:
      case PermissionType.LocationBackground:
        return 'Location';
      case PermissionType.Contacts:
        return 'Contacts';
      default:
        return 'Permission';
    }
  }

  // Convenience methods
  static async requestCameraPermission(showRationale = true): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(PermissionType.Camera, {
        title: 'Camera Permission',
        message: 'This app needs camera access to take profile photos.',
      });
    }
    return PlatformPermissions.requestPermission(PermissionType.Camera);
  }

  static async requestMediaLibraryPermission(showRationale = true): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(PermissionType.MediaLibrary, {
        title: 'Photo Library Permission',
        message: 'This app needs photo library access to select profile photos.',
      });
    }
    return PlatformPermissions.requestPermission(PermissionType.MediaLibrary);
  }

  static async requestNotificationPermission(showRationale = true): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(PermissionType.Notifications, {
        title: 'Notification Permission',
        message: 'Enable notifications to receive messages and match updates.',
      });
    }
    return PlatformPermissions.requestPermission(PermissionType.Notifications);
  }

  static async requestLocationPermission(showRationale = true): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(PermissionType.LocationForeground, {
        title: 'Location Permission',
        message: 'This app uses your location to show nearby matches and improve search results.',
      });
    }
    return PlatformPermissions.requestPermission(PermissionType.LocationForeground);
  }
}

export default PlatformPermissions;