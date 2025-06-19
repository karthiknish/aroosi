import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../constants';
import PlatformNavigation from '../components/navigation/PlatformNavigation';
import PlatformCard from '../components/ui/PlatformCard';
import PlatformButton from '../components/ui/PlatformButton';
import usePushNotifications from '../hooks/usePushNotifications';
import PlatformPermissions, { PermissionType } from '../utils/PlatformPermissions';

interface NotificationSetting {
  key: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export default function NotificationSettings() {
  const { isInitialized, isEnabled, initialize, token } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      key: 'matches',
      title: 'New Matches',
      description: 'Get notified when you have a new match',
      icon: 'heart-outline',
      enabled: true,
    },
    {
      key: 'messages',
      title: 'Messages',
      description: 'Receive notifications for new messages',
      icon: 'chatbubble-outline',
      enabled: true,
    },
    {
      key: 'interests',
      title: 'Interests',
      description: 'When someone shows interest in your profile',
      icon: 'star-outline',
      enabled: true,
    },
    {
      key: 'profile_views',
      title: 'Profile Views',
      description: 'When someone views your profile',
      icon: 'eye-outline',
      enabled: false,
    },
    {
      key: 'premium_features',
      title: 'Premium Features',
      description: 'Updates about premium features and benefits',
      icon: 'diamond-outline',
      enabled: true,
    },
    {
      key: 'app_updates',
      title: 'App Updates',
      description: 'New features and app improvements',
      icon: 'phone-portrait-outline',
      enabled: false,
    },
  ]);

  useEffect(() => {
    // Load saved settings from storage
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      // In a real app, you would load these from AsyncStorage or API
      // For now, we'll use the default settings
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSetting[]) => {
    try {
      // In a real app, you would save these to AsyncStorage and/or send to API
      setNotificationSettings(settings);
      console.log('Notification settings saved:', settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const handleToggleSetting = async (key: string, enabled: boolean) => {
    const updatedSettings = notificationSettings.map(setting =>
      setting.key === key ? { ...setting, enabled } : setting
    );
    await saveNotificationSettings(updatedSettings);
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const result = await PlatformPermissions.requestNotificationPermission();
      if (result.granted) {
        await initialize();
        Alert.alert('Success', 'Notifications have been enabled!');
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isEnabled) {
      Alert.alert('Notifications Disabled', 'Please enable notifications first.');
      return;
    }

    try {
      // This would typically be done by your backend
      Alert.alert('Test Notification', 'A test notification has been scheduled!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const renderNotificationStatus = () => (
    <PlatformCard style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Ionicons
          name={isEnabled ? 'notifications-outline' : 'notifications-off-outline'}
          size={24}
          color={isEnabled ? Colors.success[500] : Colors.error[500]}
        />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>
            Notifications {isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.statusDescription}>
            {isEnabled
              ? 'You will receive push notifications'
              : 'Enable notifications to stay updated'
            }
          </Text>
        </View>
      </View>
      
      {!isEnabled && (
        <PlatformButton
          title="Enable Notifications"
          onPress={handleEnableNotifications}
          loading={loading}
          style={styles.enableButton}
        />
      )}
      
      {isEnabled && token && (
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenLabel}>Push Token:</Text>
          <Text style={styles.tokenText} numberOfLines={2}>
            {token.data}
          </Text>
        </View>
      )}
    </PlatformCard>
  );

  const renderNotificationSetting = (setting: NotificationSetting) => (
    <PlatformCard key={setting.key} style={styles.settingCard}>
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>
          <Ionicons
            name={setting.icon as any}
            size={20}
            color={Colors.primary[500]}
          />
        </View>
        
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{setting.title}</Text>
          <Text style={styles.settingDescription}>{setting.description}</Text>
        </View>
        
        <Switch
          value={setting.enabled && isEnabled}
          onValueChange={(enabled) => handleToggleSetting(setting.key, enabled)}
          disabled={!isEnabled}
          trackColor={{
            false: Colors.neutral[300],
            true: Colors.primary[200],
          }}
          thumbColor={setting.enabled && isEnabled ? Colors.primary[500] : Colors.neutral[400]}
        />
      </View>
    </PlatformCard>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <PlatformNavigation
        title="Notification Settings"
        leftAction={{
          icon: 'arrow-back',
          onPress: () => require('expo-router').router.back(),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderNotificationStatus()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionDescription}>
            Choose which notifications you'd like to receive
          </Text>
          
          {notificationSettings.map(renderNotificationSetting)}
        </View>
        
        {isEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Notifications</Text>
            <PlatformButton
              title="Send Test Notification"
              onPress={handleTestNotification}
              variant="outline"
              style={styles.testButton}
            />
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you're not receiving notifications, make sure:
          </Text>
          <Text style={styles.helpItem}>• Notifications are enabled in device settings</Text>
          <Text style={styles.helpItem}>• Do Not Disturb mode is turned off</Text>
          <Text style={styles.helpItem}>• The app has permission to send notifications</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  content: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  
  statusCard: {
    marginBottom: Layout.spacing.lg,
  },
  
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  
  statusText: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },
  
  statusTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  
  statusDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  enableButton: {
    marginTop: Layout.spacing.md,
  },
  
  tokenInfo: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.sm,
    backgroundColor: Colors.neutral[50],
    borderRadius: Layout.radius.sm,
  },
  
  tokenLabel: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  
  tokenText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  
  section: {
    marginBottom: Layout.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  sectionDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.md,
  },
  
  settingCard: {
    marginBottom: Layout.spacing.sm,
  },
  
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  
  settingText: {
    flex: 1,
  },
  
  settingTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  
  settingDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  testButton: {
    marginTop: Layout.spacing.sm,
  },
  
  helpText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.sm,
  },
  
  helpItem: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 4,
    paddingLeft: Layout.spacing.sm,
  },
});