import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Image } from 'react-native';
import { useApiClient } from '../utils/api';

export interface PhotoUploadResult {
  success: boolean;
  imageId?: string;
  error?: string;
}

export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
}

export interface ProcessedPhoto {
  uri: string;
  metadata: PhotoMetadata;
  compressed: boolean;
}

export class PhotoService {
  private apiClient = useApiClient();
  
  // Maximum file size in bytes (5MB)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  
  // Maximum dimensions
  private readonly MAX_WIDTH = 1080;
  private readonly MAX_HEIGHT = 1080;
  
  // Compression quality
  private readonly COMPRESSION_QUALITY = 0.8;

  /**
   * Request camera and media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos for your profile.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request media library permission
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access to select photos for your profile.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Show photo selection options (camera or library)
   */
  showPhotoOptions(): Promise<ImagePicker.ImagePickerResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Add Photo',
        'Choose how you want to add your photo',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { 
            text: 'Take Photo', 
            onPress: () => this.openCamera().then(resolve)
          },
          { 
            text: 'Choose from Library', 
            onPress: () => this.openImageLibrary().then(resolve)
          },
        ]
      );
    });
  }

  /**
   * Open camera to take a photo
   */
  private async openCamera(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      return result;
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
      return null;
    }
  }

  /**
   * Open image library to select a photo
   */
  private async openImageLibrary(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      return result;
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
      return null;
    }
  }

  /**
   * Process and compress an image
   */
  async processImage(imageUri: string): Promise<ProcessedPhoto | null> {
    try {
      // First, get image info to check size and dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      let processedUri = imageUri;
      let needsProcessing = false;

      // Check if image needs resizing
      if (imageInfo.width > this.MAX_WIDTH || imageInfo.height > this.MAX_HEIGHT) {
        needsProcessing = true;
      }

      // Check file size (estimate based on dimensions)
      const estimatedSize = imageInfo.width * imageInfo.height * 3; // RGB
      if (estimatedSize > this.MAX_FILE_SIZE) {
        needsProcessing = true;
      }

      // Process image if needed
      if (needsProcessing) {
        const manipulateActions: ImageManipulator.Action[] = [];

        // Resize if too large
        if (imageInfo.width > this.MAX_WIDTH || imageInfo.height > this.MAX_HEIGHT) {
          const aspectRatio = imageInfo.width / imageInfo.height;
          let newWidth = this.MAX_WIDTH;
          let newHeight = this.MAX_HEIGHT;

          if (aspectRatio > 1) {
            newHeight = this.MAX_WIDTH / aspectRatio;
          } else {
            newWidth = this.MAX_HEIGHT * aspectRatio;
          }

          manipulateActions.push({
            resize: { width: newWidth, height: newHeight }
          });
        }

        const processed = await ImageManipulator.manipulateAsync(
          imageUri,
          manipulateActions,
          {
            compress: this.COMPRESSION_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        processedUri = processed.uri;
      }

      // Get final image info
      const finalInfo = await ImageManipulator.manipulateAsync(
        processedUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        uri: processedUri,
        metadata: {
          width: finalInfo.width,
          height: finalInfo.height,
          size: 0, // We'll calculate this during upload
          type: 'image/jpeg',
        },
        compressed: needsProcessing,
      };
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      return null;
    }
  }

  /**
   * Upload a processed photo to the server
   */
  async uploadPhoto(processedPhoto: ProcessedPhoto): Promise<PhotoUploadResult> {
    try {
      // Generate a unique filename
      const fileName = `profile_${Date.now()}.jpg`;
      
      // Get upload URL from server
      const urlResponse = await this.apiClient.getUploadUrl(fileName, 'image/jpeg');
      
      if (!urlResponse.success || !urlResponse.data?.uploadUrl) {
        return {
          success: false,
          error: urlResponse.error || 'Failed to get upload URL',
        };
      }

      // Convert image to blob for upload
      const response = await fetch(processedPhoto.uri);
      const imageBlob = await response.blob();

      // Upload image to the signed URL
      const uploadResult = await this.apiClient.uploadImageToUrl(
        urlResponse.data.uploadUrl,
        imageBlob,
        'image/jpeg'
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload image',
        };
      }

      // Confirm upload with server
      const confirmResponse = await this.apiClient.confirmImageUpload(
        fileName,
        urlResponse.data.uploadId
      );

      if (!confirmResponse.success) {
        return {
          success: false,
          error: confirmResponse.error || 'Failed to confirm upload',
        };
      }

      return {
        success: true,
        imageId: confirmResponse.data?.imageId,
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return {
        success: false,
        error: 'Upload failed. Please check your internet connection and try again.',
      };
    }
  }

  /**
   * Complete photo upload process from selection to server
   */
  async addPhoto(): Promise<PhotoUploadResult> {
    try {
      // Show photo selection options
      const pickerResult = await this.showPhotoOptions();
      
      if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]) {
        return { success: false, error: 'No photo selected' };
      }

      const asset = pickerResult.assets[0];
      
      // Process the image
      const processedPhoto = await this.processImage(asset.uri);
      
      if (!processedPhoto) {
        return { success: false, error: 'Failed to process image' };
      }

      // Upload the processed image
      const uploadResult = await this.uploadPhoto(processedPhoto);
      
      return uploadResult;
    } catch (error) {
      console.error('Error in addPhoto:', error);
      return {
        success: false,
        error: 'Failed to add photo. Please try again.',
      };
    }
  }

  /**
   * Validate image before processing
   */
  validateImage(imageUri: string): Promise<boolean> {
    return new Promise((resolve) => {
      Image.getSize(
        imageUri,
        (width, height) => {
          // Check minimum dimensions
          if (width < 200 || height < 200) {
            Alert.alert(
              'Image Too Small',
              'Please select an image that is at least 200x200 pixels.'
            );
            resolve(false);
            return;
          }

          resolve(true);
        },
        (error) => {
          console.error('Error getting image size:', error);
          Alert.alert('Error', 'Invalid image file. Please select a different photo.');
          resolve(false);
        }
      );
    });
  }
}

// Export singleton instance
export const photoService = new PhotoService();