import React, { useEffect } from 'react';
import {
  BackHandler,
  Platform,
  PanResponder,
  View,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';

interface PlatformBackHandlerProps {
  children: React.ReactNode;
  onBackPress?: () => boolean; // Return true if handled, false to allow default behavior
  enableSwipeBack?: boolean; // iOS only
  swipeAreaWidth?: number; // Width of left edge that triggers swipe back
}

export default function PlatformBackHandler({
  children,
  onBackPress,
  enableSwipeBack = true,
  swipeAreaWidth = 20,
}: PlatformBackHandlerProps) {
  const screenWidth = Dimensions.get('window').width;

  // Android back button handler
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      if (onBackPress) {
        return onBackPress();
      }
      
      // Default behavior - try to go back in router
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [onBackPress]);

  // iOS swipe back gesture handler using PanResponder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      // Only respond to gestures that start from the left edge
      return Platform.OS === 'ios' && enableSwipeBack && evt.nativeEvent.pageX < swipeAreaWidth;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only set responder if it's a horizontal swipe from left edge
      return (
        Platform.OS === 'ios' && 
        enableSwipeBack && 
        evt.nativeEvent.pageX < swipeAreaWidth &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        gestureState.dx > 0
      );
    },
    onPanResponderMove: (evt, gestureState) => {
      // Handle the swipe gesture
      // This is where you would update animation values
      // For now, we'll keep it simple without animations
    },
    onPanResponderRelease: (evt, gestureState) => {
      // Check if the swipe was significant enough to trigger back navigation
      const shouldGoBack = gestureState.dx > screenWidth * 0.3 && gestureState.vx > 0.5;
      
      if (shouldGoBack) {
        if (onBackPress) {
          const handled = onBackPress();
          if (!handled && router.canGoBack()) {
            router.back();
          }
        } else if (router.canGoBack()) {
          router.back();
        }
      }
    },
  });

  // iOS implementation with swipe gesture
  if (Platform.OS === 'ios' && enableSwipeBack) {
    return (
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {children}
      </View>
    );
  }

  // Android or iOS without swipe back
  return <View style={{ flex: 1 }}>{children}</View>;
}