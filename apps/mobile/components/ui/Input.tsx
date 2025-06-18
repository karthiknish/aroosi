import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Layout } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
}

export default function Input({
  label,
  error,
  hint,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles = [
    styles.container,
    containerStyle,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    multiline && styles.inputContainerMultiline,
  ];

  const inputStyles = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    multiline && styles.inputMultiline,
    inputStyle,
  ];

  return (
    <View style={containerStyles}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={inputStyles}
          placeholderTextColor={Colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...textInputProps}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || hint) && (
        <View style={styles.helpContainer}>
          <Text style={[styles.help, error && styles.helpError]}>
            {error || hint}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  
  labelContainer: {
    marginBottom: Layout.spacing.xs,
  },
  
  label: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  
  required: {
    color: Colors.error[500],
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
    minHeight: 44,
  },
  
  inputContainerFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },
  
  inputContainerError: {
    borderColor: Colors.error[500],
  },
  
  inputContainerMultiline: {
    minHeight: 88,
    alignItems: 'flex-start',
    paddingVertical: Layout.spacing.md,
  },
  
  input: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  
  inputWithLeftIcon: {
    paddingLeft: Layout.spacing.xs,
  },
  
  inputWithRightIcon: {
    paddingRight: Layout.spacing.xs,
  },
  
  inputMultiline: {
    minHeight: 60,
    paddingTop: Layout.spacing.sm,
  },
  
  leftIcon: {
    paddingLeft: Layout.spacing.md,
    paddingRight: Layout.spacing.xs,
  },
  
  rightIcon: {
    paddingRight: Layout.spacing.md,
    paddingLeft: Layout.spacing.xs,
  },
  
  helpContainer: {
    marginTop: Layout.spacing.xs,
  },
  
  help: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  
  helpError: {
    color: Colors.error[500],
  },
});