import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInputProps,
  ViewStyle,
  Animated,
} from 'react-native';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { PlatformDesign, PlatformUtils, Colors, Layout, PlatformInteraction } from '../../constants';

interface PlatformInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  floatingLabel?: boolean;
  required?: boolean;
  showCounter?: boolean;
  maxLength?: number;
}

export default function PlatformInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  floatingLabel = false,
  required = false,
  showCounter = false,
  value = '',
  onChangeText,
  maxLength,
  style,
  ...textInputProps
}: PlatformInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [secureText, setSecureText] = useState(textInputProps.secureTextEntry || false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  const isPasswordField = textInputProps.secureTextEntry;
  const hasValue = value && value.length > 0;
  const shouldFloatLabel = floatingLabel && (isFocused || hasValue);

  React.useEffect(() => {
    if (floatingLabel) {
      Animated.timing(animatedValue, {
        toValue: shouldFloatLabel ? 1 : 0,
        duration: PlatformDesign.animation.short,
        useNativeDriver: false,
      }).start();
    }
  }, [shouldFloatLabel, floatingLabel]);

  const handleFocus = () => {
    setIsFocused(true);
    textInputProps.onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    textInputProps.onBlur?.();
  };

  const toggleSecureText = () => {
    setSecureText(!secureText);
  };

  const handleLabelPress = () => {
    inputRef.current?.focus();
  };

  const getContainerStyle = () => {
    return {
      marginBottom: Layout.spacing.md,
    };
  };

  const getInputContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: PlatformDesign.colors.surface,
      borderWidth: PlatformDesign.input.borderWidth,
      borderRadius: PlatformDesign.radius.button,
      paddingHorizontal: Layout.spacing.md,
      minHeight: PlatformDesign.input.height,
    };

    const focusedStyle = {
      borderColor: Colors.primary[500],
      ...Platform.select({
        android: {
          elevation: 2,
        },
        ios: {
          shadowColor: Colors.primary[500],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      }),
    };

    const errorStyle = {
      borderColor: Colors.error[500],
    };

    const defaultStyle = {
      borderColor: PlatformDesign.colors.divider,
    };

    return {
      ...baseStyle,
      ...(error ? errorStyle : isFocused ? focusedStyle : defaultStyle),
    };
  };

  const getInputStyle = () => {
    return {
      flex: 1,
      fontSize: Layout.typography.fontSize.base * PlatformDesign.typography.scale,
      color: Colors.text.primary,
      paddingVertical: Platform.select({ ios: 12, android: 8 }),
      minHeight: Platform.select({ ios: 44, android: 48 }),
      textAlignVertical: textInputProps.multiline ? 'top' : 'center',
    };
  };

  const getLabelStyle = () => {
    if (!floatingLabel) {
      return {
        fontSize: Layout.typography.fontSize.sm,
        fontWeight: PlatformDesign.typography.fontWeight.medium,
        color: Colors.text.primary,
        marginBottom: Layout.spacing.sm,
      };
    }

    // Floating label animation
    const fontSize = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [Layout.typography.fontSize.base, Layout.typography.fontSize.sm],
    });

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [PlatformDesign.input.height / 2 - 8, -8],
    });

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [Layout.spacing.md, Layout.spacing.sm],
    });

    return {
      position: 'absolute' as const,
      left: 0,
      zIndex: 1,
      backgroundColor: PlatformDesign.colors.surface,
      paddingHorizontal: Layout.spacing.xs,
      fontSize,
      fontWeight: PlatformDesign.typography.fontWeight.medium,
      color: isFocused ? Colors.primary[500] : Colors.text.secondary,
      transform: [{ translateX }, { translateY }],
    };
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return (
      <Ionicons
        name={leftIcon as any}
        size={20}
        color={isFocused ? Colors.primary[500] : Colors.neutral[400]}
        style={{ marginRight: Layout.spacing.sm }}
      />
    );
  };

  const renderRightIcon = () => {
    if (isPasswordField) {
      return (
        <TouchableOpacity onPress={toggleSecureText}>
          <Ionicons
            name={secureText ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.neutral[400]}
          />
        </TouchableOpacity>
      );
    }

    if (rightIcon) {
      return (
        <TouchableOpacity onPress={onRightIconPress}>
          <Ionicons
            name={rightIcon as any}
            size={20}
            color={Colors.neutral[400]}
          />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderCounter = () => {
    if (!showCounter || !maxLength) return null;
    return (
      <Text style={styles.counter}>
        {value.length}/{maxLength}
      </Text>
    );
  };

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {/* Static Label */}
      {label && !floatingLabel && (
        <TouchableOpacity onPress={handleLabelPress}>
          <Text style={getLabelStyle()}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </TouchableOpacity>
      )}

      {/* Input Container */}
      <View style={getInputContainerStyle()}>
        {/* Floating Label */}
        {label && floatingLabel && (
          <Animated.Text style={getLabelStyle()}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Animated.Text>
        )}

        {renderLeftIcon()}

        <TextInput
          ref={inputRef}
          style={[getInputStyle(), style]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureText}
          placeholderTextColor={Colors.neutral[400]}
          selectionColor={Platform.select({
            ios: Colors.primary[500],
            android: Colors.primary[600],
          })}
          maxLength={maxLength}
          {...textInputProps}
        />

        {renderRightIcon()}
      </View>

      {/* Helper Text Row */}
      <View style={styles.helperRow}>
        <View style={styles.helperLeft}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {!error && hint && (
            <Text style={styles.hintText}>{hint}</Text>
          )}
        </View>
        {renderCounter()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  required: {
    color: Colors.error[500],
  },
  
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Layout.spacing.xs,
  },
  
  helperLeft: {
    flex: 1,
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
  },
  
  hintText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  
  counter: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.sm,
  },
});
