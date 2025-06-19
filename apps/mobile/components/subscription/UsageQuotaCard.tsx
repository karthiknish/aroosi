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

interface UsageQuotaCardProps {
  title: string;
  icon: string;
  current: number;
  max: number | null; // null means unlimited
  unit?: string;
  onUpgradePress?: () => void;
  showWarning?: boolean;
}

export default function UsageQuotaCard({
  title,
  icon,
  current,
  max,
  unit = '',
  onUpgradePress,
  showWarning = false,
}: UsageQuotaCardProps) {
  const isUnlimited = max === null;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getProgressColor = () => {
    if (isUnlimited) return Colors.success[500];
    if (isAtLimit) return Colors.error[500];
    if (isNearLimit) return Colors.warning[500];
    return Colors.primary[500];
  };

  const getUsageText = () => {
    if (isUnlimited) return `${current} ${unit}`;
    return `${current} / ${max} ${unit}`;
  };

  const getStatusText = () => {
    if (isUnlimited) return 'Unlimited';
    if (isAtLimit) return 'Limit reached';
    if (isNearLimit) return 'Near limit';
    return `${max - current} remaining`;
  };

  return (
    <View style={[
      styles.container,
      showWarning && styles.warningContainer,
    ]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconContainer, { backgroundColor: getProgressColor() + '20' }]}>
            <Ionicons name={icon} size={20} color={getProgressColor()} />
          </View>
          <View style={styles.titleText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={[styles.usage, { color: getProgressColor() }]}>
              {getUsageText()}
            </Text>
          </View>
        </View>

        {onUpgradePress && (isAtLimit || isNearLimit) && (
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      {!isUnlimited && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>
          <Text style={[styles.statusText, { color: getProgressColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      )}

      {/* Unlimited Badge */}
      {isUnlimited && (
        <View style={styles.unlimitedBadge}>
          <Ionicons name="infinite" size={16} color={Colors.success[500]} />
          <Text style={styles.unlimitedText}>Unlimited</Text>
        </View>
      )}

      {/* Warning Message */}
      {showWarning && isAtLimit && (
        <View style={styles.warningMessage}>
          <Ionicons name="warning" size={16} color={Colors.warning[600]} />
          <Text style={styles.warningText}>
            You've reached your limit. Upgrade to continue using this feature.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    marginBottom: Layout.spacing.md,
  },

  warningContainer: {
    borderColor: Colors.warning[300],
    backgroundColor: Colors.warning[50],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },

  titleText: {
    flex: 1,
  },

  title: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  usage: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },

  upgradeButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.primary[600],
  },

  progressContainer: {
    gap: Layout.spacing.sm,
  },

  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  statusText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    textAlign: 'right',
  },

  unlimitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.success[100],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    alignSelf: 'flex-start',
  },

  unlimitedText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.success[700],
  },

  warningMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
    backgroundColor: Colors.warning[100],
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.warning[200],
  },

  warningText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.warning[700],
    flex: 1,
    lineHeight: 20,
  },
});