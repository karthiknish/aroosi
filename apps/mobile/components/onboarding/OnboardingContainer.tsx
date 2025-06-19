import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerGestureEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout } from '../../constants';
import PlatformHaptics from '../../utils/PlatformHaptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface OnboardingStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<OnboardingStepProps>;
  skippable?: boolean;
  required?: boolean;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentStep: number;
  totalSteps: number;
  data: Record<string, any>;
  updateData: (updates: Record<string, any>) => void;
}

interface OnboardingContainerProps {
  steps: OnboardingStep[];
  onComplete: (data: Record<string, any>) => void;
  onSkip?: () => void;
  initialData?: Record<string, any>;
  showProgress?: boolean;
  allowSwipeNavigation?: boolean;
}

export default function OnboardingContainer({
  steps,
  onComplete,
  onSkip,
  initialData = {},
  showProgress = true,
  allowSwipeNavigation = true,
}: OnboardingContainerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState(initialData);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentStep = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  useEffect(() => {
    // Reset animation values when step changes
    translateX.setValue(0);
    opacity.setValue(1);
  }, [currentStepIndex]);

  const updateData = (updates: Record<string, any>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const animateTransition = (direction: 'next' | 'prev', callback: () => void) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    PlatformHaptics.light();

    const toValue = direction === 'next' ? -screenWidth : screenWidth;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      
      // Reset for the new step
      translateX.setValue(direction === 'next' ? screenWidth : -screenWidth);
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleNext = () => {
    if (isLast) {
      PlatformHaptics.success();
      onComplete(data);
    } else {
      animateTransition('next', () => {
        setCurrentStepIndex(prev => prev + 1);
      });
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      animateTransition('prev', () => {
        setCurrentStepIndex(prev => prev - 1);
      });
    }
  };

  const handleSkip = () => {
    if (currentStep.skippable !== false) {
      PlatformHaptics.light();
      if (isLast || !steps.slice(currentStepIndex + 1).some(step => step.required)) {
        onSkip?.() || onComplete(data);
      } else {
        // Skip to next required step or end
        const nextRequiredIndex = steps.findIndex((step, index) => 
          index > currentStepIndex && step.required
        );
        
        if (nextRequiredIndex !== -1) {
          setCurrentStepIndex(nextRequiredIndex);
        } else {
          onSkip?.() || onComplete(data);
        }
      }
    }
  };

  const handleGesture = (event: GestureHandlerGestureEvent<PanGestureHandlerEventPayload>) => {
    if (!allowSwipeNavigation || isTransitioning) return;

    const { translationX, velocityX } = event.nativeEvent;
    
    // Update the animated value
    translateX.setValue(translationX);
  };

  const handleGestureEnd = (event: GestureHandlerGestureEvent<PanGestureHandlerEventPayload>) => {
    if (!allowSwipeNavigation || isTransitioning) return;

    const { translationX, velocityX } = event.nativeEvent;
    const threshold = screenWidth * 0.3;
    const shouldSwipe = Math.abs(translationX) > threshold || Math.abs(velocityX) > 500;

    if (shouldSwipe) {
      if (translationX > 0 && !isFirst) {
        // Swipe right - go to previous step
        handlePrev();
      } else if (translationX < 0 && !isLast) {
        // Swipe left - go to next step
        handleNext();
      } else {
        // Reset animation
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // Reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const CurrentStepComponent = currentStep.component;

  return (
    <SafeAreaView style={styles.container}>
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStepIndex && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>
            {currentStepIndex + 1} of {steps.length}
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        {currentStep.subtitle && (
          <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
        )}
      </View>

      <PanGestureHandler
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleGestureEnd}
        enabled={allowSwipeNavigation && !isTransitioning}
      >
        <Animated.View
          style={[
            styles.stepContainer,
            {
              transform: [{ translateX }],
              opacity,
            },
          ]}
        >
          <CurrentStepComponent
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            isFirst={isFirst}
            isLast={isLast}
            currentStep={currentStepIndex + 1}
            totalSteps={steps.length}
            data={data}
            updateData={updateData}
          />
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  progressContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },

  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[300],
  },

  progressDotActive: {
    backgroundColor: Colors.primary[500],
    transform: [{ scale: 1.2 }],
  },

  progressText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  headerContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },

  stepTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xs,
  },

  stepSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  stepContainer: {
    flex: 1,
  },
});