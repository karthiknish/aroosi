import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { SubscriptionTier } from '../../types/subscription';

const { width: screenWidth } = Dimensions.get('window');

export interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
  title?: string;
  message?: string;
  feature?: string;
  currentTier: SubscriptionTier;
  recommendedTier?: SubscriptionTier;
  benefits?: string[];
}

export default function UpgradePrompt({
  visible,
  onClose,
  onUpgrade,
  title = 'Upgrade Required',
  message = 'This feature is only available to premium subscribers.',
  feature,
  currentTier,
  recommendedTier = 'premium',
  benefits = [],
}: UpgradePromptProps) {
  const getRecommendedPlan = () => {
    if (recommendedTier === 'premium_plus') {
      return {
        name: 'Premium Plus',
        price: '£39.99/month',
        features: [
          'Everything in Premium',
          'See who liked you',
          'Incognito browsing',
          'Priority support',
          'Unlimited profile boosts',
        ],
      };
    }
    
    return {
      name: 'Premium',
      price: '£14.99/month',
      features: [
        'Unlimited messaging',
        'Unlimited interests',
        'Advanced search filters',
        'See who viewed your profile',
        'Read receipts',
      ],
    };
  };

  const plan = getRecommendedPlan();
  const displayFeatures = benefits.length > 0 ? benefits : plan.features;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={32} color={Colors.primary[500]} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            
            {feature && (
              <View style={styles.featureBadge}>
                <Ionicons name="lock-closed" size={16} color={Colors.warning[600]} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            )}
            
            <Text style={styles.message}>{message}</Text>

            {/* Recommended Plan */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>

              <View style={styles.featuresList}>
                {displayFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={Colors.success[500]} />
                    <Text style={styles.featureItemText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Benefits Highlight */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="infinite" size={20} color={Colors.primary[500]} />
                <Text style={styles.benefitText}>Unlimited access</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.success[500]} />
                <Text style={styles.benefitText}>Cancel anytime</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="help-circle" size={20} color={Colors.warning[500]} />
                <Text style={styles.benefitText}>Premium support</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={() => onUpgrade(recommendedTier)}
            >
              <Text style={styles.upgradeButtonText}>
                Upgrade to {plan.name}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
            </TouchableOpacity>

            {recommendedTier !== 'premium_plus' && currentTier === 'free' && (
              <TouchableOpacity 
                style={styles.alternativeButton}
                onPress={() => onUpgrade('premium_plus')}
              >
                <Text style={styles.alternativeButtonText}>
                  Or try Premium Plus
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },

  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.xl,
    width: Math.min(screenWidth - Layout.spacing.lg * 2, 400),
    maxHeight: '80%',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },

  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButton: {
    padding: Layout.spacing.sm,
  },

  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },

  title: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },

  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    backgroundColor: Colors.warning[100],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.md,
  },

  featureText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.warning[700],
  },

  message: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Layout.spacing.lg,
  },

  planCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary[200],
    marginBottom: Layout.spacing.lg,
  },

  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },

  planName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[700],
  },

  planPrice: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.primary[600],
  },

  featuresList: {
    gap: Layout.spacing.sm,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },

  featureItemText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.primary,
    flex: 1,
  },

  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  benefitItem: {
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },

  benefitText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  actions: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  upgradeButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  upgradeButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.background.primary,
  },

  alternativeButton: {
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  alternativeButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },

  cancelButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.tertiary,
  },
});