import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  ActionSheetIOS,
  Dimensions,
} from 'react-native';
// @ts-expect-error - Expo ImagePicker types
import * as ImagePicker from 'expo-image-picker';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { PlatformDesign, Colors, Layout } from '../../constants';
import PlatformButton from './PlatformButton';

interface PlatformPhotoPickerProps {
  onImageSelected: (uri: string) => void;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  multiple?: boolean;
  maxImages?: number;
  children?: React.ReactNode;
  title?: string;
}

interface PhotoOption {
  title: string;
  icon: string;
  action: () => void;
}

export default function PlatformPhotoPicker({
  onImageSelected,
  allowsEditing = true,
  aspect = [1, 1],
  quality = 0.8,
  multiple = false,
  maxImages = 1,
  children,
  title = 'Select Photo',
}: PlatformPhotoPickerProps) {
  const [showModal, setShowModal] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      camera: cameraStatus === 'granted',
      media: mediaStatus === 'granted',
    };
  };

  const openCamera = async () => {
    try {
      const permissions = await requestPermissions();
      if (!permissions.camera) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
    }
    setShowModal(false);
  };

  const openGallery = async () => {
    try {
      const permissions = await requestPermissions();
      if (!permissions.media) {
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        allowsMultipleSelection: multiple,
        selectionLimit: maxImages,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery');
    }
    setShowModal(false);
  };

  const showIOSActionSheet = () => {
    const options = ['Camera', 'Photo Library', 'Cancel'];
    const cancelButtonIndex = 2;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 0:
            openCamera();
            break;
          case 1:
            openGallery();
            break;
          default:
            break;
        }
      }
    );
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      showIOSActionSheet();
    } else {
      setShowModal(true);
    }
  };

  const photoOptions: PhotoOption[] = [
    {
      title: 'Take Photo',
      icon: 'camera-outline',
      action: openCamera,
    },
    {
      title: 'Choose from Gallery',
      icon: 'images-outline',
      action: openGallery,
    },
  ];

  const renderAndroidModal = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.androidModalContainer}>
          <Text style={styles.androidModalTitle}>{title}</Text>
          
          {photoOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.androidOption}
              onPress={option.action}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={Colors.text.primary}
                style={styles.androidOptionIcon}
              />
              <Text style={styles.androidOptionText}>{option.title}</Text>
            </TouchableOpacity>
          ))}
          
          <View style={styles.androidButtonContainer}>
            <PlatformButton
              title="Cancel"
              onPress={() => setShowModal(false)}
              variant="outline"
              style={styles.androidCancelButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDefaultTrigger = () => (
    <TouchableOpacity style={styles.defaultTrigger} onPress={handlePress}>
      <Ionicons
        name="camera-outline"
        size={24}
        color={Colors.primary[500]}
        style={styles.defaultTriggerIcon}
      />
      <Text style={styles.defaultTriggerText}>Add Photo</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      {children ? (
        <TouchableOpacity onPress={handlePress}>
          {children}
        </TouchableOpacity>
      ) : (
        renderDefaultTrigger()
      )}
      
      {Platform.OS === 'android' && renderAndroidModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  defaultTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    borderRadius: PlatformDesign.radius.button,
    paddingVertical: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
    marginVertical: Layout.spacing.md,
  },

  defaultTriggerIcon: {
    marginRight: Layout.spacing.sm,
  },

  defaultTriggerText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: PlatformDesign.typography.fontWeight.medium,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  androidModalContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: PlatformDesign.radius.card,
    margin: Layout.spacing.lg,
    width: Dimensions.get('window').width - Layout.spacing.lg * 2,
    maxWidth: 320,
  },

  androidModalTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: PlatformDesign.typography.fontWeight.medium,
    color: Colors.text.primary,
    textAlign: 'center',
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  androidOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
  },

  androidOptionIcon: {
    marginRight: Layout.spacing.md,
  },

  androidOptionText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },

  androidButtonContainer: {
    padding: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  androidCancelButton: {
    marginTop: 0,
  },
});