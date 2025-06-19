import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useSubscription } from '../../hooks/useSubscription';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import UsageQuotaCard from './UsageQuotaCard';
import { LoadingState } from '../error';

interface UsageDashboardProps {
  onUpgradePress: () => void;
}

export default function UsageDashboard({ onUpgradePress }: UsageDashboardProps) {
  const { 
    loading, 
    usage, 
    subscription,
    hasActiveSubscription,
    daysUntilExpiry 
  } = useSubscription();

  const { currentTier } = useFeatureGate();

  if (loading) {
    return <LoadingState message="Loading usage data..." />;
  }

  if (!usage) {
    return null;
  }

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case 'free': return 'Free';
      case 'premium': return 'Premium';
      case 'premium_plus': return 'Premium Plus';
      default: return tier;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isApproachingExpiry = daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Subscription Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusInfo}>
            <Text style={styles.currentPlan}>Current Plan</Text>
            <Text style={styles.planName}>{getTierDisplayName(currentTier)}</Text>
          </View>
          
          {hasActiveSubscription && (
            <View style={[
              styles.statusBadge,
              isApproachingExpiry && styles.warningBadge
            ]}>
              <Ionicons 
                name={isApproachingExpiry ? "warning" : "checkmark-circle"} 
                size={16} 
                color={isApproachingExpiry ? Colors.warning[600] : Colors.success[600]} 
              />
              <Text style={[
                styles.statusText,
                isApproachingExpiry && styles.warningText
              ]}>
                {isApproachingExpiry ? 'Expires Soon' : 'Active'}
              </Text>
            </View>
          )}
        </View>

        {subscription && (
          <View style={styles.subscriptionDetails}>
            <Text style={styles.detailText}>
              {hasActiveSubscription 
                ? `Expires on ${formatDate(subscription.currentPeriodEnd)}`
                : 'Subscription expired'
              }
            </Text>
            
            {isApproachingExpiry && (
              <Text style={styles.expiryWarning}>
                Renews in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}

        {!hasActiveSubscription && (
          <TouchableOpacity style={styles.upgradePrompt} onPress={onUpgradePress}>
            <Text style={styles.upgradePromptText}>
              Upgrade to unlock unlimited features
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Usage Period */}
      <View style={styles.periodCard}>
        <Text style={styles.periodTitle}>Current Usage Period</Text>
        <Text style={styles.periodDates}>
          {formatDate(usage.periodStart)} - {formatDate(usage.periodEnd)}
        </Text>
      </View>

      {/* Usage Quotas */}
      <View style={styles.quotasSection}>
        <Text style={styles.sectionTitle}>Feature Usage</Text>
        
        <UsageQuotaCard
          title="Messages Sent"
          icon="chatbubble-ellipses"
          current={usage.messagesSent}
          max={usage.limits.maxMessages}
          unit="messages"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === 'free'}
        />

        <UsageQuotaCard
          title="Interests Sent"
          icon="heart"
          current={usage.interestsSent}
          max={usage.limits.maxInterests}
          unit="interests"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === 'free'}
        />

        <UsageQuotaCard
          title="Profile Views"
          icon="eye"
          current={usage.profileViews}
          max={usage.limits.maxProfileViews}
          unit="views"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === 'free'}
        />

        <UsageQuotaCard
          title="Searches Performed"
          icon="search"
          current={usage.searchesPerformed}
          max={usage.limits.maxSearches}
          unit="searches"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === 'free'}
        />

        <UsageQuotaCard
          title="Profile Boosts"
          icon="trending-up"
          current={usage.profileBoosts}
          max={usage.limits.maxProfileBoosts}
          unit="boosts"
          onUpgradePress={onUpgradePress}
          showWarning={!usage.limits.canBoostProfile}
        />
      </View>

      {/* Premium Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Premium Features</Text>
        
        <View style={styles.featuresList}>
          <FeatureItem
            title="Advanced Search Filters"
            icon="filter"
            available={usage.limits.canUseAdvancedFilters}
            onUpgradePress={onUpgradePress}
          />
          
          <FeatureItem
            title="See Who Viewed Your Profile"
            icon="eye"
            available={usage.limits.canSeeWhoViewedProfile}
            onUpgradePress={onUpgradePress}
          />
          
          <FeatureItem
            title="Read Receipts"
            icon="checkmark-done"
            available={usage.limits.canSeeReadReceipts}
            onUpgradePress={onUpgradePress}
          />
          
          <FeatureItem
            title="See Who Liked You"
            icon="heart"
            available={usage.limits.canViewWhoLikedMe}
            onUpgradePress={onUpgradePress}
          />
          
          <FeatureItem
            title="Incognito Mode"
            icon="eye-off"
            available={usage.limits.canUseIncognitoMode}
            onUpgradePress={onUpgradePress}
          />
          
          <FeatureItem
            title="Priority Support"
            icon="headset"
            available={usage.limits.canAccessPrioritySupport}
            onUpgradePress={onUpgradePress}
          />
        </View>
      </View>
    </ScrollView>
  );
}

interface FeatureItemProps {
  title: string;
  icon: string;
  available: boolean;
  onUpgradePress: () => void;
}

function FeatureItem({ title, icon, available, onUpgradePress }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureInfo}>
        <View style={[
          styles.featureIcon,
          { backgroundColor: available ? Colors.success[100] : Colors.neutral[100] }
        ]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={available ? Colors.success[600] : Colors.neutral[400]} 
          />
        </View>
        <Text style={[
          styles.featureTitle,
          !available && styles.featureTitleDisabled
        ]}>
          {title}
        </Text>
      </View>
      
      <View style={styles.featureStatus}>
        {available ? (
          <View style={styles.availableBadge}>
            <Ionicons name="checkmark" size={16} color={Colors.success[600]} />
          </View>
        ) : (
          <TouchableOpacity style={styles.lockedBadge} onPress={onUpgradePress}>
            <Ionicons name="lock-closed" size={14} color={Colors.neutral[500]} />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  content: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },

  // Status Card
  statusCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },

  statusInfo: {
    flex: 1,
  },

  currentPlan: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },

  planName: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.success[100],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },

  warningBadge: {
    backgroundColor: Colors.warning[100],
  },

  statusText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.success[700],
  },

  warningText: {
    color: Colors.warning[700],
  },

  subscriptionDetails: {
    gap: Layout.spacing.xs,
  },

  detailText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  expiryWarning: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.warning[600],
    fontWeight: Layout.typography.fontWeight.medium,
  },

  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    backgroundColor: Colors.primary[50],
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    marginTop: Layout.spacing.md,
  },

  upgradePromptText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.primary[600],
  },

  // Period Card
  periodCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
    alignItems: 'center',
  },

  periodTitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },

  periodDates: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  // Sections
  quotasSection: {
    marginBottom: Layout.spacing.xl,
  },

  featuresSection: {
    marginBottom: Layout.spacing.xl,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },

  // Features List
  featuresList: {
    gap: Layout.spacing.md,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },

  featureTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },

  featureTitleDisabled: {
    color: Colors.text.secondary,
  },

  featureStatus: {
    marginLeft: Layout.spacing.md,
  },

  availableBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },

  upgradeText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.neutral[600],
  },
});