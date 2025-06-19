import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { ProfileImage } from '../../hooks/usePhotoManagement';
import PlatformHaptics from '../../utils/PlatformHaptics';

const { width: screenWidth } = Dimensions.get('window');

interface PhotoGalleryProps {
  images: ProfileImage[];
  onAddPhoto?: () => void;
  onDeletePhoto?: (imageId: string) => void;
  onReorderPhotos?: (newOrder: ProfileImage[]) => void;
  onSetMainPhoto?: (imageId: string) => void;
  uploading?: boolean;
  deleting?: string | null;
  canAddMore?: boolean;
  maxPhotos?: number;
  editable?: boolean;
  showAddButton?: boolean;
}

interface PhotoSlotProps {
  image?: ProfileImage;
  isMain?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onSetMain?: () => void;
  uploading?: boolean;
  deleting?: boolean;
  editable?: boolean;
  isEmpty?: boolean;
  showAddText?: boolean;
}

function PhotoSlot({ 
  image, 
  isMain, 
  onPress, 
  onDelete, 
  onSetMain,
  uploading, 
  deleting,
  editable = true,
  isEmpty = false,
  showAddText = true,
}: PhotoSlotProps) {
  const [showActions, setShowActions] = useState(false);

  const handleLongPress = () => {
    if (editable && image && !uploading && !deleting) {
      PlatformHaptics.medium();
      setShowActions(true);
    }
  };

  const handleSetMain = () => {
    setShowActions(false);
    onSetMain?.();
  };

  const handleDelete = () => {
    setShowActions(false);
    onDelete?.();
  };

  if (isEmpty) {
    return (
      <TouchableOpacity
        style={styles.photoSlot}
        onPress={onPress}
        disabled={uploading}
        activeOpacity={0.7}
      >
        <View style={styles.emptySlot}>
          {uploading ? (
            <Ionicons name="cloud-upload" size={24} color={Colors.primary[500]} />
          ) : (
            <Ionicons name="add" size={24} color={Colors.neutral[400]} />
          )}
          {showAddText && (
            <Text style={styles.emptySlotText}>
              {uploading ? 'Uploading...' : 'Add Photo'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.photoSlot}
        onPress={onPress}
        onLongPress={handleLongPress}
        disabled={uploading || deleting}
        activeOpacity={0.7}
      >
        <Image source={{ uri: image?.thumbnailUrl || image?.url }} style={styles.photoImage} />
        
        {isMain && (
          <View style={styles.mainBadge}>
            <Ionicons name="star" size={12} color={Colors.background.primary} />
            <Text style={styles.mainBadgeText}>Main</Text>
          </View>
        )}

        {deleting && (
          <View style={styles.loadingOverlay}>
            <Ionicons name="trash" size={20} color={Colors.error[500]} />
          </View>
        )}

        {editable && !deleting && (
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLongPress}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={Colors.background.primary} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions Modal */}
      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={() => setShowActions(false)}
            activeOpacity={1}
          />
          
          <View style={styles.actionsSheet}>
            <View style={styles.actionsHeader}>
              <Text style={styles.actionsTitle}>Photo Options</Text>
              <TouchableOpacity onPress={() => setShowActions(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionsList}>
              {!isMain && (
                <TouchableOpacity style={styles.actionItem} onPress={handleSetMain}>
                  <Ionicons name="star-outline" size={20} color={Colors.warning[500]} />
                  <Text style={styles.actionText}>Set as Main Photo</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                <Text style={[styles.actionText, { color: Colors.error[500] }]}>Delete Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function PhotoGallery({
  images,
  onAddPhoto,
  onDeletePhoto,
  onSetMainPhoto,
  uploading = false,
  deleting = null,
  canAddMore = true,
  maxPhotos = 6,
  editable = true,
  showAddButton = true,
}: PhotoGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);

  const handlePhotoPress = (image: ProfileImage) => {
    setSelectedImage(image);
  };

  const handleAddPhoto = () => {
    if (canAddMore && onAddPhoto) {
      onAddPhoto();
    } else if (!canAddMore) {
      Alert.alert(
        'Photo Limit Reached',
        `You can only have up to ${maxPhotos} photos.`
      );
    }
  };

  const handleDeletePhoto = (imageId: string) => {
    onDeletePhoto?.(imageId);
  };

  const handleSetMainPhoto = (imageId: string) => {
    onSetMainPhoto?.(imageId);
  };

  const renderPhotoGrid = () => {
    const slots = [];
    const mainImage = images.find(img => img.isMain) || images[0];

    // Add existing photos
    images.forEach((image, index) => {
      slots.push(
        <PhotoSlot
          key={image.id}
          image={image}
          isMain={image.id === mainImage?.id}
          onPress={() => handlePhotoPress(image)}
          onDelete={() => handleDeletePhoto(image.id)}
          onSetMain={() => handleSetMainPhoto(image.id)}
          uploading={uploading}
          deleting={deleting === image.id}
          editable={editable}
        />
      );
    });

    // Add empty slots for remaining photos
    if (showAddButton && canAddMore && images.length < maxPhotos) {
      slots.push(
        <PhotoSlot
          key="add-photo"
          isEmpty
          onPress={handleAddPhoto}
          uploading={uploading}
          editable={editable}
          showAddText={images.length === 0}
        />
      );
    }

    // Fill remaining slots with placeholders if needed (for layout)
    const remainingSlots = maxPhotos - slots.length;
    for (let i = 0; i < remainingSlots; i++) {
      slots.push(
        <View key={`placeholder-${i}`} style={[styles.photoSlot, styles.placeholderSlot]} />
      );
    }

    return slots;
  };

  return (
    <View style={styles.container}>
      <View style={styles.photoGrid}>
        {renderPhotoGrid()}
      </View>

      {images.length > 0 && (
        <View style={styles.photoInfo}>
          <Text style={styles.photoCount}>
            {images.length} of {maxPhotos} photos
          </Text>
          {images.length > 0 && (
            <Text style={styles.photoTip}>
              Long press a photo to set as main or delete
            </Text>
          )}
        </View>
      )}

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity 
            style={styles.fullScreenBackdrop}
            onPress={() => setSelectedImage(null)}
            activeOpacity={1}
          />
          
          <View style={styles.fullScreenContent}>
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Ionicons name="close" size={24} color={Colors.background.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage.url }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    justifyContent: 'space-between',
  },

  photoSlot: {
    width: (screenWidth - Layout.spacing.lg * 2 - Layout.spacing.sm) / 2,
    height: 120,
    borderRadius: Layout.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  emptySlot: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.primary,
    borderStyle: 'dashed',
  },

  emptySlotText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },

  placeholderSlot: {
    backgroundColor: 'transparent',
  },

  mainBadge: {
    position: 'absolute',
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    backgroundColor: Colors.warning[500],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
    gap: 2,
  },

  mainBadgeText: {
    fontSize: 10,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.bold,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoActions: {
    position: 'absolute',
    top: Layout.spacing.xs,
    right: Layout.spacing.xs,
  },

  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoInfo: {
    marginTop: Layout.spacing.md,
    alignItems: 'center',
  },

  photoCount: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  photoTip: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    flex: 1,
  },

  actionsSheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    maxHeight: '40%',
  },

  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  actionsTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  actionsList: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    gap: Layout.spacing.md,
  },

  actionText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  // Full screen modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },

  fullScreenBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
  },

  fullScreenHeader: {
    position: 'absolute',
    top: 50,
    right: Layout.spacing.lg,
    zIndex: 1,
  },

  fullScreenImage: {
    width: screenWidth,
    height: '100%',
  },
});