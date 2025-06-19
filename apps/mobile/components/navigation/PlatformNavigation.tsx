import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { PlatformDesign, Colors, Layout } from '../../constants';

interface PlatformNavigationProps {
  title?: string;
  leftAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
  };
  rightAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
  };
  subtitle?: string;
  backgroundColor?: string;
  showBorder?: boolean;
  translucent?: boolean;
}

export default function PlatformNavigation({
  title,
  leftAction,
  rightAction,
  subtitle,
  backgroundColor = Colors.background.primary,
  showBorder = true,
  translucent = false,
}: PlatformNavigationProps) {
  const getHeaderStyles = () => {
    const baseStyles = {
      backgroundColor: translucent ? 'transparent' : backgroundColor,
      paddingHorizontal: Layout.spacing.md,
      minHeight: Platform.select({ ios: 44, android: 56 }),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    };

    const platformStyles = Platform.select({
      ios: {
        borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: Colors.border.primary,
      },
      android: {
        elevation: showBorder ? 4 : 0,
        shadowColor: Colors.text.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    });

    return {
      ...baseStyles,
      ...platformStyles,
    };
  };

  const getTitleStyles = () => {
    return Platform.select({
      ios: {
        fontSize: Layout.typography.fontSize.lg,
        fontWeight: PlatformDesign.typography.fontWeight.semibold,
        color: Colors.text.primary,
        textAlign: 'center' as const,
        flex: 1,
      },
      android: {
        fontSize: Layout.typography.fontSize.xl,
        fontWeight: PlatformDesign.typography.fontWeight.medium,
        color: Colors.text.primary,
        marginLeft: leftAction ? Layout.spacing.md : 0,
        flex: 1,
      },
    });
  };

  const getActionButtonStyles = (position: 'left' | 'right') => {
    const baseStyles = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: Layout.spacing.sm,
      paddingHorizontal: Layout.spacing.xs,
      borderRadius: PlatformDesign.radius.button,
    };

    return Platform.select({
      ios: {
        ...baseStyles,
        minWidth: 44,
        justifyContent: position === 'left' ? 'flex-start' : 'flex-end',
      },
      android: {
        ...baseStyles,
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center' as const,
      },
    });
  };

  const getActionTextStyles = () => {
    return Platform.select({
      ios: {
        fontSize: Layout.typography.fontSize.base,
        color: Colors.primary[500],
        fontWeight: PlatformDesign.typography.fontWeight.regular,
      },
      android: {
        fontSize: Layout.typography.fontSize.sm,
        color: Colors.primary[500],
        fontWeight: PlatformDesign.typography.fontWeight.medium,
        textTransform: 'uppercase' as const,
      },
    });
  };

  const renderLeftAction = () => {
    if (!leftAction) return <View style={styles.actionPlaceholder} />;

    return (
      <TouchableOpacity 
        style={getActionButtonStyles('left')}
        onPress={leftAction.onPress}
        activeOpacity={0.7}
      >
        {leftAction.icon && (
          <Ionicons
            name={leftAction.icon as any}
            size={Platform.select({ ios: 22, android: 24 })}
            color={Colors.primary[500]}
            style={leftAction.text ? { marginRight: Layout.spacing.xs } : undefined}
          />
        )}
        {leftAction.text && (
          <Text style={getActionTextStyles()}>{leftAction.text}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRightAction = () => {
    if (!rightAction) return <View style={styles.actionPlaceholder} />;

    return (
      <TouchableOpacity 
        style={getActionButtonStyles('right')}
        onPress={rightAction.onPress}
        activeOpacity={0.7}
      >
        {rightAction.text && (
          <Text style={[getActionTextStyles(), rightAction.icon && { marginRight: Layout.spacing.xs }]}>
            {rightAction.text}
          </Text>
        )}
        {rightAction.icon && (
          <Ionicons
            name={rightAction.icon as any}
            size={Platform.select({ ios: 22, android: 24 })}
            color={Colors.primary[500]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderTitle = () => {
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.iosTitleContainer}>
          {title && <Text style={getTitleStyles()}>{title}</Text>}
          {subtitle && <Text style={styles.iosSubtitle}>{subtitle}</Text>}
        </View>
      );
    }

    return (
      <View style={styles.androidTitleContainer}>
        {title && <Text style={getTitleStyles()} numberOfLines={1}>{title}</Text>}
        {subtitle && <Text style={styles.androidSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor }}>
      <StatusBar
        barStyle={Platform.select({
          ios: 'dark-content',
          android: 'dark-content',
        })}
        backgroundColor={backgroundColor}
        translucent={translucent}
      />
      <View style={getHeaderStyles()}>
        {renderLeftAction()}
        {renderTitle()}
        {renderRightAction()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionPlaceholder: {
    width: Platform.select({ ios: 44, android: 48 }),
  },

  iosTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.sm,
  },

  androidTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  iosSubtitle: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },

  androidSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});