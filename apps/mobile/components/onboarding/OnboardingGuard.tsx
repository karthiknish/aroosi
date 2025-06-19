import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useOnboarding } from '../../hooks/useOnboarding';
import { LoadingState } from '../error';

interface OnboardingGuardProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  redirectTo?: string;
}

export default function OnboardingGuard({ 
  children, 
  requireOnboarding = true,
  redirectTo = '/onboarding'
}: OnboardingGuardProps) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { shouldShow, isLoading: onboardingLoading } = useOnboarding();
  const router = useRouter();

  // Wait for auth and onboarding to load
  if (!authLoaded || onboardingLoading) {
    return <LoadingState fullScreen message="Loading..." />;
  }

  // If user is not signed in, let the auth guard handle it
  if (!isSignedIn) {
    return <>{children}</>;
  }

  // If onboarding is required and should be shown, redirect to onboarding
  if (requireOnboarding && shouldShow) {
    router.replace(redirectTo);
    return <LoadingState fullScreen message="Redirecting to onboarding..." />;
  }

  // Otherwise, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of OnboardingGuard
 */
export function withOnboardingGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<OnboardingGuardProps, 'children'> = {}
) {
  return function OnboardingGuardedComponent(props: P) {
    return (
      <OnboardingGuard {...options}>
        <Component {...props} />
      </OnboardingGuard>
    );
  };
}