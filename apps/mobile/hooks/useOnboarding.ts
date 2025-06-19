import { useState, useEffect, useCallback } from 'react';
import { onboardingManager, OnboardingProgress } from '../utils/onboardingManager';

export interface UseOnboardingResult {
  progress: OnboardingProgress | null;
  isLoading: boolean;
  shouldShow: boolean;
  currentStep: string | null;
  completionPercentage: number;
  remainingSteps: string[];
  
  // Actions
  startOnboarding: () => Promise<void>;
  completeStep: (stepId: string, userData?: Record<string, any>) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  goToStep: (stepId: string) => Promise<void>;
  completeOnboarding: (userData?: Record<string, any>) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  // Helpers
  isStepCompleted: (stepId: string) => boolean;
  isStepSkipped: (stepId: string) => boolean;
  canSkipStep: (stepId: string) => boolean;
}

export function useOnboarding(): UseOnboardingResult {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);

  // Initialize onboarding
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await onboardingManager.initialize();
        
        const shouldShowOnboarding = await onboardingManager.shouldShowOnboarding();
        setShouldShow(shouldShowOnboarding);
        
        const currentProgress = onboardingManager.getProgress();
        setProgress(currentProgress);
      } catch (error) {
        console.error('Failed to initialize onboarding:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Refresh progress from manager
  const refreshProgress = useCallback(() => {
    const currentProgress = onboardingManager.getProgress();
    setProgress(currentProgress);
  }, []);

  // Start onboarding
  const startOnboarding = useCallback(async () => {
    try {
      const newProgress = await onboardingManager.startOnboarding();
      setProgress(newProgress);
      setShouldShow(true);
    } catch (error) {
      console.error('Failed to start onboarding:', error);
    }
  }, []);

  // Complete a step
  const completeStep = useCallback(async (stepId: string, userData: Record<string, any> = {}) => {
    try {
      await onboardingManager.completeStep(stepId, userData);
      refreshProgress();
      
      // Check if onboarding is now complete
      const updatedProgress = onboardingManager.getProgress();
      if (updatedProgress?.completed) {
        setShouldShow(false);
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  }, [refreshProgress]);

  // Skip a step
  const skipStep = useCallback(async (stepId: string) => {
    try {
      await onboardingManager.skipStep(stepId);
      refreshProgress();
      
      // Check if onboarding is now complete
      const updatedProgress = onboardingManager.getProgress();
      if (updatedProgress?.completed) {
        setShouldShow(false);
      }
    } catch (error) {
      console.error('Failed to skip step:', error);
    }
  }, [refreshProgress]);

  // Go to specific step
  const goToStep = useCallback(async (stepId: string) => {
    try {
      await onboardingManager.goToStep(stepId);
      refreshProgress();
    } catch (error) {
      console.error('Failed to go to step:', error);
    }
  }, [refreshProgress]);

  // Complete entire onboarding
  const completeOnboarding = useCallback(async (userData: Record<string, any> = {}) => {
    try {
      await onboardingManager.completeOnboarding(userData);
      refreshProgress();
      setShouldShow(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [refreshProgress]);

  // Reset onboarding
  const resetOnboarding = useCallback(async () => {
    try {
      await onboardingManager.resetOnboarding();
      setProgress(null);
      setShouldShow(true);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  }, []);

  // Helper functions
  const isStepCompleted = useCallback((stepId: string) => {
    return onboardingManager.isStepCompleted(stepId);
  }, []);

  const isStepSkipped = useCallback((stepId: string) => {
    return onboardingManager.isStepSkipped(stepId);
  }, []);

  const canSkipStep = useCallback((stepId: string) => {
    return onboardingManager.canSkipStep(stepId);
  }, []);

  return {
    progress,
    isLoading,
    shouldShow,
    currentStep: progress?.currentStep || null,
    completionPercentage: onboardingManager.getCompletionPercentage(),
    remainingSteps: onboardingManager.getRemainingSteps(),
    
    // Actions
    startOnboarding,
    completeStep,
    skipStep,
    goToStep,
    completeOnboarding,
    resetOnboarding,
    
    // Helpers
    isStepCompleted,
    isStepSkipped,
    canSkipStep,
  };
}