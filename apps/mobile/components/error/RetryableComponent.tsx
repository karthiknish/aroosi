import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { AppError } from '../../utils/errorHandling';
import PlatformHaptics from '../../utils/PlatformHaptics';

interface RetryableComponentProps {
  loading: boolean;
  error: AppError | null;
  onRetry: () => void;
  canRetry: boolean;
  attempt?: number;
  maxAttempts?: number;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  errorTitle?: string;
  retryButtonText?: string;
}

export default function RetryableComponent({
  loading,
  error,
  onRetry,
  canRetry,
  attempt = 0,
  maxAttempts = 3,
  children,
  emptyState,
  errorTitle = 'Something went wrong',
  retryButtonText = 'Try Again',
}: RetryableComponentProps) {
  const handleRetry = () => {
    PlatformHaptics.light();
    onRetry();
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        {attempt > 1 && (
          <Text style={styles.attemptText}>
            Attempt {attempt} of {maxAttempts}...
          </Text>
        )}
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorIcon}>
            <Ionicons 
              name={error.type === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'} 
              size={48} 
              color={Colors.error[500]} 
            />
          </View>

          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorMessage}>{error.userMessage}</Text>

          {attempt > 1 && (
            <Text style={styles.attemptInfo}>
              Failed after {attempt} attempt{attempt > 1 ? 's' : ''}
            </Text>
          )}

          {canRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh-outline" size={20} color={Colors.background.primary} />
              <Text style={styles.retryButtonText}>{retryButtonText}</Text>
            </TouchableOpacity>
          )}

          {!canRetry && attempt >= maxAttempts && (
            <View style={styles.maxAttemptsContainer}>
              <Text style={styles.maxAttemptsText}>
                Maximum retry attempts reached. Please try again later.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Show empty state if provided and no children
  if (emptyState && !children) {
    return <>{emptyState}</>;
  }

  // Show children (success state)
  return <>{children}</>;
}

// Higher-order component version
export function withRetryable<P extends object>(
  Component: React.ComponentType<P>,
  defaultProps?: Partial<RetryableComponentProps>
) {
  return function RetryableWrappedComponent(
    props: P & Partial<RetryableComponentProps>
  ) {
    const {
      loading = false,
      error = null,
      onRetry = () => {},
      canRetry = true,
      attempt,
      maxAttempts,
      emptyState,
      errorTitle,
      retryButtonText,
      ...componentProps
    } = { ...defaultProps, ...props };

    return (
      <RetryableComponent
        loading={loading}
        error={error}
        onRetry={onRetry}
        canRetry={canRetry}
        attempt={attempt}
        maxAttempts={maxAttempts}
        emptyState={emptyState}
        errorTitle={errorTitle}
        retryButtonText={retryButtonText}
      >
        <Component {...(componentProps as P)} />
      </RetryableComponent>
    );
  };
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },

  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },

  errorIcon: {
    marginBottom: Layout.spacing.lg,
  },

  errorTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },

  errorMessage: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Layout.spacing.lg,
  },

  attemptText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.sm,
  },

  attemptInfo: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.sm,
  },

  retryButtonText: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },

  maxAttemptsContainer: {
    backgroundColor: Colors.neutral[100],
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    marginTop: Layout.spacing.md,
  },

  maxAttemptsText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});