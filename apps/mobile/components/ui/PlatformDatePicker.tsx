import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
// @ts-expect-error - DateTimePicker types
import DateTimePicker from '@react-native-community/datetimepicker';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { PlatformDesign, PlatformUtils, Colors, Layout } from '../../constants';
import PlatformButton from './PlatformButton';

interface PlatformDatePickerProps {
  value?: Date;
  onDateChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PlatformDatePicker({
  value,
  onDateChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
  label,
  error,
  disabled = false,
  style,
}: PlatformDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDate = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (mode === 'time') {
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate && event.type === 'set') {
        onDateChange(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIOSConfirm = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleIOSCancel = () => {
    setTempDate(value || new Date());
    setShowPicker(false);
  };

  const renderIOSPicker = () => (
    <Modal visible={showPicker} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.iosPickerContainer}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={handleIOSCancel}>
              <Text style={styles.iosPickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={styles.iosPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode={mode}
            display="wheel"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="light"
          />
        </View>
      </View>
    </Modal>
  );

  const renderAndroidPicker = () => {
    if (!showPicker) return null;
    
    return (
      <DateTimePicker
        value={value || new Date()}
        mode={mode}
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          error && styles.errorButton,
          disabled && styles.disabledButton,
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.dateText,
          !value && styles.placeholderText,
          disabled && styles.disabledText,
        ]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={20}
          color={disabled ? Colors.neutral[400] : Colors.neutral[600]}
        />
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {Platform.OS === 'ios' ? renderIOSPicker() : renderAndroidPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  
  label: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: PlatformDesign.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: PlatformDesign.input.height,
    paddingHorizontal: Layout.spacing.md,
    backgroundColor: PlatformDesign.colors.surface,
    borderWidth: PlatformDesign.input.borderWidth,
    borderColor: PlatformDesign.colors.divider,
    borderRadius: PlatformDesign.radius.button,
    ...Platform.select({
      android: {
        elevation: 1,
      },
    }),
  },
  
  errorButton: {
    borderColor: Colors.error[500],
  },
  
  disabledButton: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[200],
  },
  
  dateText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  
  placeholderText: {
    color: Colors.neutral[400],
  },
  
  disabledText: {
    color: Colors.neutral[400],
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
  
  // iOS Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  iosPickerContainer: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
  },
  
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  iosPickerCancel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  iosPickerDone: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: PlatformDesign.typography.fontWeight.medium,
  },
});
