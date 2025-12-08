"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { createErrorBoundaryHandler } from "@/lib/utils/errorHandling";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: (error: Error, errorInfo: React.ErrorInfo) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.errorHandler = (error: Error, errorInfo: React.ErrorInfo) => {
      const handler = createErrorBoundaryHandler("ErrorBoundary");
      handler(error, { componentStack: errorInfo.componentStack || "" });
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error using our centralized error handling
    this.errorHandler(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-light px-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-danger" />
            </div>

            <h2 className="text-xl font-semibold text-neutral-dark mb-2">
              Something went wrong
            </h2>

            <p className="text-neutral-light mb-6">
              We&apos;re sorry, but something unexpected happened. Please try
              refreshing the page or go back to the home page.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-neutral-dark mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-neutral-100 p-3 rounded text-xs font-mono text-neutral-dark overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-primary hover:bg-primary-dark"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const handleError = React.useCallback(
    (error: unknown, context?: Record<string, unknown>) => {
      // Import dynamically to avoid circular dependencies
      import("@/lib/utils/errorHandling").then(
        ({ handleError: handleErrorUtil }) => {
          handleErrorUtil(error, context);
        }
      );
    },
    []
  );

  return handleError;
}
