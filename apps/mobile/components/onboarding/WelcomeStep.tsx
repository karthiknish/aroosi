import React from 'react';
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
import { OnboardingStepProps } from './OnboardingContainer';

export default function WelcomeStep({
  onNext,
  onSkip,
}: OnboardingStepProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={60} color={Colors.primary[500]} />
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.appName}>Aroosi</Text>
          <Text style={styles.subtitle}>
            The trusted Afghan matrimony platform connecting hearts across the UK
          </Text>
          
          <View style={styles.highlightContainer}>
            <View style={styles.highlightItem}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.success[500]} />
              <Text style={styles.highlightText}>Verified Profiles</Text>
            </View>
            
            <View style={styles.highlightItem}>
              <Ionicons name="people" size={24} color={Colors.primary[500]} />
              <Text style={styles.highlightText}>Afghan Community</Text>
            </View>
            
            <View style={styles.highlightItem}>
              <Ionicons name="lock-closed" size={24} color={Colors.warning[500]} />
              <Text style={styles.highlightText}>Safe & Secure</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip Tour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startButton} onPress={onNext}>
            <Text style={styles.startButtonText}>Start Tour</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
          </TouchableOpacity>
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
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  textContainer: {
    alignItems: 'center',
  },

  welcomeText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },

  appName: {
    fontSize: Layout.typography.fontSize['3xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[600],
    marginBottom: Layout.spacing.md,
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Layout.spacing.xl,
  },

  highlightContainer: {
    width: '100%',
    gap: Layout.spacing.lg,
  },

  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    backgroundColor: Colors.background.secondary,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },

  highlightText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
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

  skipButton: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
  },

  skipButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.tertiary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  startButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: Layout.radius.md,
  },

  startButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});