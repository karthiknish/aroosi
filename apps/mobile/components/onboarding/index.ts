// Main components
export { default as OnboardingContainer } from './OnboardingContainer';
export { default as OnboardingGuard, withOnboardingGuard } from './OnboardingGuard';

// Step components
export { default as WelcomeStep } from './WelcomeStep';
export { default as FeatureTourStep } from './FeatureTourStep';
export { default as ProfileGuidanceStep } from './ProfileGuidanceStep';
export { default as PreferencesSetupStep } from './PreferencesSetupStep';

// Types
export type { OnboardingStep, OnboardingStepProps } from './OnboardingContainer';
export type { FeatureTourStepData } from './FeatureTourStep';

// Hooks and utilities
export { useOnboarding } from '../../hooks/useOnboarding';
export { onboardingManager } from '../../utils/onboardingManager';
export type { 
  OnboardingProgress, 
  OnboardingConfig 
} from '../../utils/onboardingManager';