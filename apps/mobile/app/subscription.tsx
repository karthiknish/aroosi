import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../constants';
import { useSubscription } from '../hooks/useSubscription';
import { useFeatureGate } from '../hooks/useFeatureGate';
import { SubscriptionPlan, SubscriptionTier } from '../types/subscription';
import { SUBSCRIPTION_PLANS } from '../utils/inAppPurchases';
import SubscriptionCard from '../components/subscription/SubscriptionCard';
import UpgradePrompt from '../components/subscription/UpgradePrompt';
import UsageDashboard from '../components/subscription/UsageDashboard';
import { LoadingState, ErrorState } from '../components/error';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradePromptConfig, setUpgradePromptConfig] = useState<{
    title?: string;
    message?: string;
    feature?: string;
    recommendedTier?: SubscriptionTier;
  }>({});
  const [loading, setLoading] = useState(false);

  const {
    subscription,
    loading: subscriptionLoading,
    error,
    hasActiveSubscription,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
  } = useSubscription();

  const { currentTier } = useFeatureGate();

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    if (plan.tier === currentTier) return;
    setSelectedPlan(plan);
  };

  const handleUpgrade = async (tier?: SubscriptionTier) => {
    try {
      setLoading(true);
      const targetPlan = tier 
        ? SUBSCRIPTION_PLANS.find(p => p.tier === tier)
        : selectedPlan;

      if (!targetPlan) {
        Alert.alert('Error', 'Please select a subscription plan');
        return;
      }

      const success = await purchaseSubscription(targetPlan.id);
      
      if (success) {
        Alert.alert(
          'Subscription Active!',
          `You now have access to all ${targetPlan.name} features.`,
          [{ text: 'OK', onPress: () => setUpgradePromptVisible(false) }]
        );
        setSelectedPlan(null);
      } else {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete your subscription. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await cancelSubscription();
              
              if (success) {
                Alert.alert(
                  'Subscription Cancelled',
                  'Your subscription has been cancelled. You will retain access until the end of your current billing period.'
                );
              } else {
                Alert.alert(
                  'Error',
                  'Unable to cancel subscription. Please contact support.'
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const success = await restorePurchases();
      
      if (success) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully.'
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showUpgradePrompt = (config: {
    title?: string;
    message?: string;
    feature?: string;
    recommendedTier?: SubscriptionTier;
  } = {}) => {
    setUpgradePromptConfig(config);
    setUpgradePromptVisible(true);
  };

  if (subscriptionLoading) {
    return <LoadingState message="Loading subscription details..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Usage Dashboard */}
      <UsageDashboard onUpgradePress={() => showUpgradePrompt()} />

      {/* Current Subscription Status */}
      {hasActiveSubscription && subscription && (
        <View style={styles.currentSubscriptionCard}>
          <Text style={styles.sectionTitle}>Current Subscription</Text>
          <View style={styles.currentSubscriptionInfo}>
            <View style={styles.subscriptionDetails}>
              <Text style={styles.currentPlanName}>
                {subscription.tier === 'premium' ? 'Premium' : 'Premium Plus'}
              </Text>
              <Text style={styles.currentPlanStatus}>
                Active until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Subscription Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        <Text style={styles.sectionSubtitle}>
          Upgrade to unlock unlimited features and find your perfect match
        </Text>

        {SUBSCRIPTION_PLANS.map((plan) => (
          <SubscriptionCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan?.id === plan.id}
            isCurrentPlan={plan.tier === currentTier}
            onSelect={handlePlanSelect}
            disabled={loading}
          />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {selectedPlan && selectedPlan.tier !== currentTier && (
          <TouchableOpacity
            style={[styles.upgradeButton, loading && styles.disabledButton]}
            onPress={() => handleUpgrade()}
            disabled={loading}
          >
            <Text style={styles.upgradeButtonText}>
              {loading ? 'Processing...' : `Upgrade to ${selectedPlan.name}`}
            </Text>
            {!loading && (
              <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.restoreButton, loading && styles.disabledButton]}
          onPress={handleRestorePurchases}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary[500]} />
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      {/* Terms and Privacy */}
      <View style={styles.legalSection}>
        <Text style={styles.legalText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions automatically renew unless cancelled.
        </Text>
      </View>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        onUpgrade={handleUpgrade}
        currentTier={currentTier}
        recommendedTier={upgradePromptConfig.recommendedTier}
        title={upgradePromptConfig.title}
        message={upgradePromptConfig.message}
        feature={upgradePromptConfig.feature}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  backButton: {
    padding: Layout.spacing.sm,
  },

  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  currentSubscriptionCard: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  currentSubscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  subscriptionDetails: {
    flex: 1,
  },

  currentPlanName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  currentPlanStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  cancelButton: {
    backgroundColor: Colors.error[100],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.error[300],
  },

  cancelButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.error[600],
  },

  plansSection: {
    padding: Layout.spacing.lg,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },

  sectionSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xl,
    lineHeight: 22,
  },

  actionsSection: {
    padding: Layout.spacing.lg,
    paddingTop: 0,
    gap: Layout.spacing.md,
  },

  upgradeButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.lg,
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
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.background.primary,
  },

  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  restoreButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.primary[500],
  },

  disabledButton: {
    opacity: 0.6,
  },

  legalSection: {
    padding: Layout.spacing.lg,
    paddingTop: 0,
  },

  legalText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});