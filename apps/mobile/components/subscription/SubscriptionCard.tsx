import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { SubscriptionPlan } from '../../types/subscription';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  disabled?: boolean;
}

export default function SubscriptionCard({
  plan,
  isSelected = false,
  isCurrentPlan = false,
  onSelect,
  disabled = false,
}: SubscriptionCardProps) {
  const handlePress = () => {
    if (!disabled && !isCurrentPlan) {
      onSelect(plan);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        isCurrentPlan && styles.currentPlan,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || isCurrentPlan}
    >
      {/* Popular Badge */}
      {plan.popularBadge && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <View style={styles.currentBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success[500]} />
          <Text style={styles.currentText}>Current Plan</Text>
        </View>
      )}

      {/* Plan Header */}
      <View style={styles.header}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(plan.price, plan.currency)}</Text>
          {plan.price > 0 && (
            <Text style={styles.duration}>/{plan.duration}</Text>
          )}
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{plan.description}</Text>

      {/* Features */}
      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons 
              name="checkmark" 
              size={16} 
              color={isSelected || isCurrentPlan ? Colors.primary[500] : Colors.success[500]} 
            />
            <Text style={[
              styles.featureText,
              (isSelected || isCurrentPlan) && styles.featureTextSelected
            ]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {/* Selection Indicator */}
      {isSelected && !isCurrentPlan && (
        <View style={styles.selectionIndicator}>
          <Ionicons name="radio-button-on" size={24} color={Colors.primary[500]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    position: 'relative',
    marginBottom: Layout.spacing.md,
  },

  selected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },

  currentPlan: {
    borderColor: Colors.success[500],
    backgroundColor: Colors.success[50],
  },

  disabled: {
    opacity: 0.6,
  },

  popularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: Colors.warning[500],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    zIndex: 1,
  },

  popularText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.background.primary,
    textAlign: 'center',
  },

  currentBadge: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.success[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },

  currentText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.success[700],
  },

  header: {
    marginTop: plan => plan.popularBadge ? Layout.spacing.md : 0,
    marginBottom: Layout.spacing.md,
  },

  planName: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  price: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[600],
  },

  duration: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.xs,
  },

  description: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
    lineHeight: 22,
  },

  features: {
    gap: Layout.spacing.sm,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },

  featureText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },

  featureTextSelected: {
    color: Colors.primary[700],
    fontWeight: Layout.typography.fontWeight.medium,
  },

  selectionIndicator: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
  },
});