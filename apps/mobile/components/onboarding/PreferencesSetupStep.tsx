import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { OnboardingStepProps } from './OnboardingContainer';

interface PreferenceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface PreferenceSection {
  id: string;
  title: string;
  description: string;
  type: 'range' | 'multi-select' | 'single-select' | 'toggle';
  options?: PreferenceOption[];
  defaultValue?: any;
}

const preferencesSections: PreferenceSection[] = [
  {
    id: 'age-range',
    title: 'Age Preference',
    description: 'Preferred age range for matches',
    type: 'range',
    defaultValue: { min: 25, max: 35 }
  },
  {
    id: 'location-preference',
    title: 'Location Preference',
    description: 'How far are you willing to travel?',
    type: 'single-select',
    options: [
      { id: 'same-city', label: 'Same city only', icon: 'location' },
      { id: 'within-50km', label: 'Within 50km', icon: 'car' },
      { id: 'within-uk', label: 'Anywhere in UK', icon: 'globe' },
      { id: 'anywhere', label: 'Anywhere', icon: 'airplane' }
    ],
    defaultValue: 'within-50km'
  },
  {
    id: 'education-level',
    title: 'Education Level',
    description: 'Minimum education level preference',
    type: 'single-select',
    options: [
      { id: 'any', label: 'Any level', icon: 'school' },
      { id: 'high-school', label: 'High School', icon: 'school' },
      { id: 'bachelors', label: 'Bachelor\'s Degree', icon: 'school' },
      { id: 'masters', label: 'Master\'s Degree', icon: 'school' },
      { id: 'doctorate', label: 'Doctorate', icon: 'school' }
    ],
    defaultValue: 'any'
  },
  {
    id: 'lifestyle-preferences',
    title: 'Lifestyle Preferences',
    description: 'Important lifestyle factors',
    type: 'multi-select',
    options: [
      { id: 'non-smoker', label: 'Non-smoker', icon: 'ban' },
      { id: 'religious', label: 'Religious', icon: 'moon' },
      { id: 'family-oriented', label: 'Family-oriented', icon: 'people' },
      { id: 'career-focused', label: 'Career-focused', icon: 'briefcase' },
      { id: 'health-conscious', label: 'Health-conscious', icon: 'fitness' }
    ],
    defaultValue: []
  },
  {
    id: 'notification-preferences',
    title: 'Notification Preferences',
    description: 'How do you want to be notified?',
    type: 'toggle',
    options: [
      { id: 'new-matches', label: 'New matches', description: 'Get notified about new potential matches' },
      { id: 'messages', label: 'Messages', description: 'Get notified about new messages' },
      { id: 'interests', label: 'Interests', description: 'Get notified when someone shows interest' },
      { id: 'profile-views', label: 'Profile views', description: 'Get notified when someone views your profile' }
    ],
    defaultValue: {
      'new-matches': true,
      'messages': true,
      'interests': true,
      'profile-views': false
    }
  }
];

export default function PreferencesSetupStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  data,
  updateData,
}: OnboardingStepProps) {
  const [preferences, setPreferences] = useState(data.preferences || {});

  const updatePreference = (sectionId: string, value: any) => {
    const newPreferences = { ...preferences, [sectionId]: value };
    setPreferences(newPreferences);
    updateData({ preferences: newPreferences });
  };

  const renderRangeSelector = (section: PreferenceSection) => {
    const value = preferences[section.id] || section.defaultValue;
    
    return (
      <View style={styles.rangeContainer}>
        <View style={styles.rangeInputs}>
          <View style={styles.rangeInput}>
            <Text style={styles.rangeLabel}>Min Age</Text>
            <TouchableOpacity 
              style={styles.rangeButton}
              onPress={() => {
                // In a real app, you'd show a picker
                const newValue = { ...value, min: Math.max(18, value.min - 1) };
                updatePreference(section.id, newValue);
              }}
            >
              <Ionicons name="remove" size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.rangeValue}>{value.min}</Text>
            <TouchableOpacity 
              style={styles.rangeButton}
              onPress={() => {
                const newValue = { ...value, min: Math.min(value.max - 1, value.min + 1) };
                updatePreference(section.id, newValue);
              }}
            >
              <Ionicons name="add" size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rangeInput}>
            <Text style={styles.rangeLabel}>Max Age</Text>
            <TouchableOpacity 
              style={styles.rangeButton}
              onPress={() => {
                const newValue = { ...value, max: Math.max(value.min + 1, value.max - 1) };
                updatePreference(section.id, newValue);
              }}
            >
              <Ionicons name="remove" size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.rangeValue}>{value.max}</Text>
            <TouchableOpacity 
              style={styles.rangeButton}
              onPress={() => {
                const newValue = { ...value, max: Math.min(70, value.max + 1) };
                updatePreference(section.id, newValue);
              }}
            >
              <Ionicons name="add" size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSingleSelect = (section: PreferenceSection) => {
    const selectedValue = preferences[section.id] || section.defaultValue;
    
    return (
      <View style={styles.optionsContainer}>
        {section.options?.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              selectedValue === option.id && styles.optionCardSelected
            ]}
            onPress={() => updatePreference(section.id, option.id)}
          >
            {option.icon && (
              <Ionicons 
                name={option.icon} 
                size={20} 
                color={selectedValue === option.id ? Colors.primary[500] : Colors.text.secondary} 
              />
            )}
            <Text style={[
              styles.optionLabel,
              selectedValue === option.id && styles.optionLabelSelected
            ]}>
              {option.label}
            </Text>
            {selectedValue === option.id && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary[500]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMultiSelect = (section: PreferenceSection) => {
    const selectedValues = preferences[section.id] || section.defaultValue || [];
    
    return (
      <View style={styles.optionsContainer}>
        {section.options?.map((option) => {
          const isSelected = selectedValues.includes(option.id);
          
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected
              ]}
              onPress={() => {
                const newValues = isSelected
                  ? selectedValues.filter((id: string) => id !== option.id)
                  : [...selectedValues, option.id];
                updatePreference(section.id, newValues);
              }}
            >
              {option.icon && (
                <Ionicons 
                  name={option.icon} 
                  size={20} 
                  color={isSelected ? Colors.primary[500] : Colors.text.secondary} 
                />
              )}
              <Text style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected
              ]}>
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary[500]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderToggle = (section: PreferenceSection) => {
    const values = preferences[section.id] || section.defaultValue || {};
    
    return (
      <View style={styles.toggleContainer}>
        {section.options?.map((option) => (
          <View key={option.id} style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{option.label}</Text>
              {option.description && (
                <Text style={styles.toggleDescription}>{option.description}</Text>
              )}
            </View>
            <Switch
              value={values[option.id] || false}
              onValueChange={(value) => {
                const newValues = { ...values, [option.id]: value };
                updatePreference(section.id, newValues);
              }}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={values[option.id] ? Colors.primary[500] : Colors.neutral[400]}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderSection = (section: PreferenceSection) => {
    switch (section.type) {
      case 'range':
        return renderRangeSelector(section);
      case 'single-select':
        return renderSingleSelect(section);
      case 'multi-select':
        return renderMultiSelect(section);
      case 'toggle':
        return renderToggle(section);
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="settings" size={60} color={Colors.primary[500]} />
          </View>
          <Text style={styles.title}>Set Your Preferences</Text>
          <Text style={styles.subtitle}>
            Help us find better matches by setting your preferences. You can change these anytime.
          </Text>
        </View>

        {/* Preferences Sections */}
        <View style={styles.sectionsContainer}>
          {preferencesSections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDescription}>{section.description}</Text>
              </View>
              {renderSection(section)}
            </View>
          ))}
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
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>
                {isLast ? 'Complete Setup' : 'Continue'}
              </Text>
              <Ionicons 
                name={isLast ? "checkmark-circle" : "chevron-forward"} 
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

  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },

  iconContainer: {
    marginBottom: Layout.spacing.md,
  },

  title: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionsContainer: {
    gap: Layout.spacing.lg,
  },

  sectionCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  sectionHeader: {
    marginBottom: Layout.spacing.md,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  sectionDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  // Range selector styles
  rangeContainer: {
    gap: Layout.spacing.md,
  },

  rangeInputs: {
    flexDirection: 'row',
    gap: Layout.spacing.lg,
  },

  rangeInput: {
    flex: 1,
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },

  rangeLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  rangeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  rangeValue: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    minWidth: 40,
    textAlign: 'center',
  },

  // Options styles
  optionsContainer: {
    gap: Layout.spacing.sm,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },

  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },

  optionLabel: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  optionLabelSelected: {
    color: Colors.primary[600],
    fontWeight: Layout.typography.fontWeight.semibold,
  },

  // Toggle styles
  toggleContainer: {
    gap: Layout.spacing.md,
  },

  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
  },

  toggleInfo: {
    flex: 1,
    marginRight: Layout.spacing.md,
  },

  toggleLabel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
    marginBottom: Layout.spacing.xs,
  },

  toggleDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  // Navigation styles
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