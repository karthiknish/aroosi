import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import PlatformHaptics from '../../utils/PlatformHaptics';

const { width: screenWidth } = Dimensions.get('window');

interface OfflineBannerProps {
  showWhenOffline?: boolean;
  position?: 'top' | 'bottom';
  persistent?: boolean;
}

export default function OfflineBanner({
  showWhenOffline = true,
  position = 'top',
  persistent = false,
}: OfflineBannerProps) {
  const { isOnline, retry } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const shouldShow = showWhenOffline && !isOnline;
    
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      PlatformHaptics.warning();
      
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else if (!shouldShow && isVisible && !persistent) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOnline, showWhenOffline, isVisible, persistent, slideAnim]);

  const handleRetry = () => {
    PlatformHaptics.light();
    retry();
  };

  if (!isVisible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: position === 'top' ? [-100, 0] : [100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Ionicons 
            name="cloud-offline-outline" 
            size={20} 
            color={Colors.background.primary} 
          />
          <Text style={styles.message}>
            {isOnline ? 'Back online!' : 'No internet connection'}
          </Text>
        </View>
        
        {!isOnline && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons 
              name="refresh-outline" 
              size={16} 
              color={Colors.background.primary} 
            />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: Layout.spacing.md,
  },

  topPosition: {
    top: 50, // Account for status bar
  },

  bottomPosition: {
    bottom: 100, // Account for tab bar
  },

  content: {
    backgroundColor: Colors.warning[600],
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Layout.spacing.sm,
  },

  message: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    flex: 1,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
    gap: Layout.spacing.xs,
  },

  retryText: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});