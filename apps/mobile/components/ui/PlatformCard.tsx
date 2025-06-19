import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableNativeFeedback,
  Platform,
  ViewStyle,
} from 'react-native';
import { PlatformDesign, PlatformUtils, Colors } from '../../constants';

interface PlatformCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rippleEffect?: boolean;
}

export default function PlatformCard({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
  rippleEffect = true,
}: PlatformCardProps) {
  const getCardStyles = () => {
    const baseStyle = {
      backgroundColor: PlatformDesign.colors.surface,
      borderRadius: PlatformDesign.radius.card,
    };

    const variantStyles = {
      default: {
        ...PlatformDesign.shadows.small,
      },
      elevated: {
        ...PlatformDesign.shadows.medium,
      },
      outlined: {
        borderWidth: PlatformUtils.getValue(1, 1),
        borderColor: PlatformDesign.colors.divider,
        ...Platform.select({
          ios: {},
          android: { elevation: 0 },
        }),
      },
    };

    const paddingStyles = {
      none: {},
      sm: {
        padding: 12,
      },
      md: {
        padding: 16,
      },
      lg: {
        padding: 24,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...paddingStyles[padding],
    };
  };

  const cardStyle = [getCardStyles(), style];

  if (onPress) {
    // Android Material Design with ripple
    if (Platform.OS === 'android' && rippleEffect) {
      return (
        <View style={[cardStyle, { overflow: 'hidden' }]}>
          <TouchableNativeFeedback
            onPress={onPress}
            background={TouchableNativeFeedback.Ripple('rgba(0,0,0,0.1)', false)}
          >
            <View style={styles.cardContent}>
              {children}
            </View>
          </TouchableNativeFeedback>
        </View>
      );
    }

    // iOS with TouchableOpacity
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Non-interactive card
  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    flex: 1,
  },
});
