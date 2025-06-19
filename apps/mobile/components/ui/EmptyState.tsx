import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
  illustration?: React.ReactNode;
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  message,
  actionText,
  onAction,
  style,
  illustration,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {illustration || (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={64} color={Colors.neutral[400]} />
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}

        {actionText && onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },

  content: {
    alignItems: 'center',
    maxWidth: 300,
  },

  iconContainer: {
    marginBottom: Layout.spacing.lg,
  },

  title: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },

  message: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Layout.spacing.xl,
  },

  actionButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },

  actionButtonText: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});