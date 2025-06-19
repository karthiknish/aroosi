import React from 'react';
import { router } from 'expo-router';
import OnboardingContainer, { OnboardingStep } from '../components/onboarding/OnboardingContainer';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import FeatureTourStep, { FeatureTourStepData } from '../components/onboarding/FeatureTourStep';
import ProfileGuidanceStep from '../components/onboarding/ProfileGuidanceStep';
import PreferencesSetupStep from '../components/onboarding/PreferencesSetupStep';
import { useOnboarding } from '../hooks/useOnboarding';
import { LoadingState } from '../components/error';

// Feature tour data
const featureTourSteps: FeatureTourStepData[] = [
  {
    icon: 'search',
    title: 'Smart Matching',
    description: 'Find your perfect match with our intelligent algorithm that considers your preferences, values, and cultural background.',
    features: [
      'Advanced filtering by age, location, education',
      'Cultural and religious compatibility matching',
      'Lifestyle preferences alignment',
      'Daily curated matches just for you'
    ],
    ctaText: 'Find Matches'
  },
  {
    icon: 'chatbubbles',
    title: 'Secure Messaging',
    description: 'Connect safely with verified members through our secure messaging platform designed for meaningful conversations.',
    features: [
      'End-to-end encrypted conversations',
      'Photo and voice message sharing',
      'Video call integration',
      'Safe communication environment'
    ]
  },
  {
    icon: 'shield-checkmark',
    title: 'Verified Profiles',
    description: 'Every profile is manually reviewed and verified to ensure authentic connections within the Afghan community.',
    features: [
      'Photo verification system',
      'Background checks available',
      'Community moderation',
      'Report and block features'
    ]
  },
  {
    icon: 'heart',
    title: 'Express Interest',
    description: 'Show interest in someone special and see if the feeling is mutual with our interest system.',
    features: [
      'Send and receive interests',
      'See who viewed your profile',
      'Match notifications',
      'Icebreaker suggestions'
    ]
  }
];

// Create onboarding steps
const createOnboardingSteps = (featureSteps: FeatureTourStepData[]): OnboardingStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to Aroosi',
    component: WelcomeStep,
    required: true,
  },
  ...featureSteps.map((stepData, index) => ({
    id: `feature-${index + 1}`,
    title: stepData.title,
    subtitle: 'Discover what makes Aroosi special',
    component: (props: any) => <FeatureTourStep {...props} stepData={stepData} />,
    skippable: true,
  })),
  {
    id: 'profile-guidance',
    title: 'Profile Setup Guide',
    subtitle: 'Learn how to create an amazing profile',
    component: ProfileGuidanceStep,
    skippable: true,
  },
  {
    id: 'preferences',
    title: 'Set Your Preferences',
    subtitle: 'Help us find better matches for you',
    component: PreferencesSetupStep,
    skippable: true,
  }
];

export default function OnboardingScreen() {
  const { 
    completeOnboarding, 
    isLoading,
    progress 
  } = useOnboarding();

  // Show loading while initializing
  if (isLoading) {
    return <LoadingState fullScreen message="Loading..." />;
  }

  const steps = createOnboardingSteps(featureTourSteps);

  const handleComplete = async (data: Record<string, any>) => {
    try {
      // Save onboarding completion
      await completeOnboarding(data);
      
      // Navigate based on user state
      if (data.preferences || progress?.userData?.preferences) {
        // If preferences were set, go to main app
        router.replace('/(tabs)');
      } else {
        // Otherwise, go to profile setup
        router.replace('/profile-setup');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Fallback navigation
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    try {
      // Complete onboarding without full data
      await completeOnboarding({});
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      // Fallback navigation
      router.replace('/(tabs)');
    }
  };

  return (
    <OnboardingContainer
      steps={steps}
      onComplete={handleComplete}
      onSkip={handleSkip}
      initialData={progress?.userData || {}}
      showProgress={true}
      allowSwipeNavigation={true}
    />
  );
}