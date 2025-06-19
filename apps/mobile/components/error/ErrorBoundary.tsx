import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import PlatformHaptics from '../../utils/PlatformHaptics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Haptic feedback for error
    PlatformHaptics.error();
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleRetry = () => {
    PlatformHaptics.light();
    this.resetErrorBoundary();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={64} color={Colors.error[500]} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. Please try again or restart the app if the problem persists.
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Ionicons name="refresh-outline" size={20} color={Colors.background.primary} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Details (Development Mode)</Text>
                <Text style={styles.errorDetailsText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    `\n\nComponent Stack:${this.state.errorInfo.componentStack}`
                  )}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // In a real app, you might want to report this to an error tracking service
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    throw error; // Re-throw to trigger error boundary
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },

  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },

  iconContainer: {
    marginBottom: Layout.spacing.xl,
  },

  title: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },

  message: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Layout.spacing.xl,
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

  errorDetails: {
    marginTop: Layout.spacing.xl,
    maxHeight: 200,
    backgroundColor: Colors.neutral[100],
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
  },

  errorDetailsTitle: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },

  errorDetailsText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
});