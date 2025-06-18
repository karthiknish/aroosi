import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Layout } from '../../constants';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof Layout.spacing;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  ...touchableProps
}: CardProps) {
  const cardStyles = [
    styles.base,
    styles[variant],
    { padding: Layout.spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.9}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background.primary,
  },
  
  default: {
    // No additional styling
  },
  
  elevated: {
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
});