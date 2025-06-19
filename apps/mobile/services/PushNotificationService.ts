import { Platform } from 'react-native';
import PlatformPermissions, { PermissionType } from '../utils/PlatformPermissions';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
  sound?: string;
  badge?: number;
}

export interface NotificationResponse {
  notification: NotificationData;
  actionIdentifier: string;
  userText?: string;
}

export interface PushToken {
  data: string;
  type: 'expo' | 'ios' | 'android';
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private notificationsModule: any = null;
  private isInitialized = false;
  private token: PushToken | null = null;
  private listeners: Array<(notification: NotificationData) => void> = [];
  private responseListeners: Array<(response: NotificationResponse) => void> = [];

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private constructor() {
    this.loadNotificationsModule();
  }

  private async loadNotificationsModule() {
    try {
      // @ts-expect-error - Expo Notifications
      this.notificationsModule = require('expo-notifications');
      
      // Set notification handler
      this.notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to load notifications module:', error);
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.notificationsModule) {
      await this.loadNotificationsModule();
    }

    if (!this.isInitialized) {
      return false;
    }

    try {
      // Request permissions
      const permissionResult = await PlatformPermissions.requestNotificationPermission();
      if (!permissionResult.granted) {
        console.warn('Notification permission not granted');
        return false;
      }

      // Get push token
      await this.getExpoPushToken();

      // Set up listeners
      this.setupNotificationListeners();

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private async getExpoPushToken(): Promise<PushToken | null> {
    try {
      if (!this.notificationsModule) return null;

      const tokenData = await this.notificationsModule.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.token = {
        data: tokenData.data,
        type: tokenData.type || 'expo',
      };

      return this.token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private setupNotificationListeners() {
    if (!this.notificationsModule) return;

    // Listen for notifications when app is in foreground
    this.notificationsModule.addNotificationReceivedListener((notification: any) => {
      const notificationData: NotificationData = {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        sound: notification.request.content.sound,
        badge: notification.request.content.badge,
      };

      this.listeners.forEach(listener => listener(notificationData));
    });

    // Listen for notification responses (when user taps notification)
    this.notificationsModule.addNotificationResponseReceivedListener((response: any) => {
      const notificationResponse: NotificationResponse = {
        notification: {
          title: response.notification.request.content.title,
          body: response.notification.request.content.body,
          data: response.notification.request.content.data,
        },
        actionIdentifier: response.actionIdentifier,
        userText: response.userText,
      };

      this.responseListeners.forEach(listener => listener(notificationResponse));
    });
  }

  async scheduleLocalNotification(notification: NotificationData, triggerSeconds?: number): Promise<string | null> {
    if (!this.notificationsModule) return null;

    try {
      const identifier = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound || 'default',
          badge: notification.badge,
        },
        trigger: triggerSeconds ? { seconds: triggerSeconds } : null,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    if (!this.notificationsModule) return;

    try {
      await this.notificationsModule.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (!this.notificationsModule) return;

    try {
      await this.notificationsModule.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    if (!this.notificationsModule) return;

    try {
      await this.notificationsModule.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    if (!this.notificationsModule) return 0;

    try {
      return await this.notificationsModule.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  getToken(): PushToken | null {
    return this.token;
  }

  addNotificationListener(listener: (notification: NotificationData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  addNotificationResponseListener(listener: (response: NotificationResponse) => void): () => void {
    this.responseListeners.push(listener);
    return () => {
      const index = this.responseListeners.indexOf(listener);
      if (index > -1) {
        this.responseListeners.splice(index, 1);
      }
    };
  }

  // Convenience methods for common notification scenarios
  async notifyNewMatch(matchName: string, matchId: string): Promise<void> {
    await this.scheduleLocalNotification({
      title: '💕 New Match!',
      body: `You have a new match with ${matchName}`,
      data: { type: 'match', matchId },
      sound: 'default',
    });
  }

  async notifyNewMessage(senderName: string, message: string, conversationId: string): Promise<void> {
    await this.scheduleLocalNotification({
      title: `Message from ${senderName}`,
      body: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      data: { type: 'message', conversationId },
      sound: 'default',
    });
  }

  async notifyInterestReceived(senderName: string, senderId: string): Promise<void> {
    await this.scheduleLocalNotification({
      title: '💖 Someone is interested!',
      body: `${senderName} sent you an interest`,
      data: { type: 'interest', senderId },
      sound: 'default',
    });
  }

  async notifyProfileView(viewerName: string, viewerId: string): Promise<void> {
    await this.scheduleLocalNotification({
      title: '👁️ Profile View',
      body: `${viewerName} viewed your profile`,
      data: { type: 'profile_view', viewerId },
      sound: 'default',
    });
  }

  async sendTokenToServer(userId: string): Promise<boolean> {
    if (!this.token) return false;

    try {
      // This would typically send the token to your backend
      const response = await fetch('/api/notifications/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token: this.token.data,
          platform: Platform.OS,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send token to server:', error);
      return false;
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    const result = await PlatformPermissions.checkPermission(PermissionType.Notifications);
    return result.granted;
  }
}

export default PushNotificationService;