import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { OnboardingStepProps } from './OnboardingContainer';

export interface FeatureTourStepData {
  icon: string;
  image?: any; // require('./path/to/image.png')
  title: string;
  description: string;
  features: string[];
  ctaText?: string;
}

interface FeatureTourStepProps extends OnboardingStepProps {
  stepData: FeatureTourStepData;
}

export default function FeatureTourStep({
  stepData,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: FeatureTourStepProps) {
  const { icon, image, title, description, features, ctaText } = stepData;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Icon or Image */}
        <View style={styles.visualContainer}>
          {image ? (
            <Image source={image} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={80} color={Colors.primary[500]} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={Colors.success[500]} 
                  />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <View style={styles.navigationButtons}>
          {!isFirst && (
            <TouchableOpacity style={styles.backButton} onPress={onPrev}>
              <Ionicons name="chevron-back" size={20} color={Colors.text.secondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.rightButtons}>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>
                {isLast ? (ctaText || 'Get Started') : 'Next'}
              </Text>
              <Ionicons 
                name={isLast ? "rocket" : "chevron-forward"} 
                size={20} 
                color={Colors.background.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },

  visualContainer: {
    alignItems: 'center',
    marginVertical: Layout.spacing.xl,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    width: 280,
    height: 200,
  },

  textContainer: {
    alignItems: 'center',
  },

  title: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },

  description: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Layout.spacing.xl,
  },

  featuresList: {
    width: '100%',
    gap: Layout.spacing.md,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.sm,
  },

  featureBullet: {
    marginTop: 2,
  },

  featureText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 22,
  },

  navigationContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
  },

  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },

  skipButton: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
  },

  skipButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.tertiary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  nextButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.md,
  },

  nextButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});