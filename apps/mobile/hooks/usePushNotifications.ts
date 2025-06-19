import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import PushNotificationService, { NotificationData, NotificationResponse, PushToken } from '../services/PushNotificationService';

interface PushNotificationHook {
  isInitialized: boolean;
  token: PushToken | null;
  isEnabled: boolean;
  initialize: () => Promise<boolean>;
  scheduleNotification: (notification: NotificationData, triggerSeconds?: number) => Promise<string | null>;
  setBadgeCount: (count: number) => Promise<void>;
  getBadgeCount: () => Promise<number>;
  sendTokenToServer: (userId: string) => Promise<boolean>;
}

export default function usePushNotifications(): PushNotificationHook {
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<PushToken | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const pushService = PushNotificationService.getInstance();

  const initialize = useCallback(async () => {
    try {
      const success = await pushService.initialize();
      setIsInitialized(success);
      
      if (success) {
        const pushToken = pushService.getToken();
        setToken(pushToken);
        
        const enabled = await pushService.areNotificationsEnabled();
        setIsEnabled(enabled);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }, []);

  const scheduleNotification = useCallback(async (notification: NotificationData, triggerSeconds?: number) => {
    return await pushService.scheduleLocalNotification(notification, triggerSeconds);
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    await pushService.setBadgeCount(count);
  }, []);

  const getBadgeCount = useCallback(async () => {
    return await pushService.getBadgeCount();
  }, []);

  const sendTokenToServer = useCallback(async (userId: string) => {
    return await pushService.sendTokenToServer(userId);
  }, []);

  // Handle notification responses (when user taps notification)
  useEffect(() => {
    const unsubscribe = pushService.addNotificationResponseListener((response: NotificationResponse) => {
      const { data } = response.notification;
      
      if (data?.type) {
        switch (data.type) {
          case 'match':
            if (data.matchId) {
              router.push(`/matches/${data.matchId}`);
            }
            break;
            
          case 'message':
            if (data.conversationId) {
              router.push(`/chat/${data.conversationId}`);
            }
            break;
            
          case 'interest':
            if (data.senderId) {
              router.push(`/profile/${data.senderId}`);
            }
            break;
            
          case 'profile_view':
            if (data.viewerId) {
              router.push(`/profile/${data.viewerId}`);
            }
            break;
            
          default:
            // Navigate to main screen
            router.push('/(tabs)/matches');
            break;
        }
      }
    });

    return unsubscribe;
  }, []);

  // Handle foreground notifications
  useEffect(() => {
    const unsubscribe = pushService.addNotificationListener((notification: NotificationData) => {
      // You can handle foreground notifications here
      // For example, show a custom in-app notification
      console.log('Received notification while app is open:', notification);
    });

    return unsubscribe;
  }, []);

  // Handle app state changes for badge updates
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized) {
        // Clear badge when app becomes active 
        await pushService.setBadgeCount(0);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isInitialized]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    token,
    isEnabled,
    initialize,
    scheduleNotification,
    setBadgeCount,
    getBadgeCount,
    sendTokenToServer,
  };
}