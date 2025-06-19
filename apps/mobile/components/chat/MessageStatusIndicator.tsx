import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { MessageStatus } from '../../types/message';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  size?: number;
  showLabel?: boolean;
}

export default function MessageStatusIndicator({
  status,
  size = 12,
  showLabel = false,
}: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return 'time-outline';
      case 'sent':
        return 'checkmark';
      case 'delivered':
        return 'checkmark-done';
      case 'read':
        return 'checkmark-done';
      case 'failed':
        return 'alert-circle';
      default:
        return 'time-outline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return Colors.text.tertiary;
      case 'sent':
        return Colors.text.secondary;
      case 'delivered':
        return Colors.text.secondary;
      case 'read':
        return Colors.primary[500];
      case 'failed':
        return Colors.error[500];
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusOpacity = () => {
    switch (status) {
      case 'sending':
        return 0.5;
      case 'sent':
        return 0.7;
      case 'delivered':
        return 0.8;
      case 'read':
        return 1;
      case 'failed':
        return 1;
      default:
        return 0.5;
    }
  };

  return (
    <View style={[styles.container, { opacity: getStatusOpacity() }]}>
      <Ionicons
        name={getStatusIcon()}
        size={size}
        color={getStatusColor()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});