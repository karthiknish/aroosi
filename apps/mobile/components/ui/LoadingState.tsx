import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, Layout } from '../../constants';

export interface LoadingStateProps {
  size?: 'small' | 'large';
  message?: string;
  style?: ViewStyle;
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingState({
  size = 'large',
  message,
  style,
  color = Colors.primary[500],
  fullScreen = false,
}: LoadingStateProps) {
  const containerStyle = [
    fullScreen ? styles.fullScreenContainer : styles.container,
    style,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={color}
        style={styles.spinner}
      />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
  },

  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },

  spinner: {
    marginBottom: Layout.spacing.md,
  },

  message: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
  },
});