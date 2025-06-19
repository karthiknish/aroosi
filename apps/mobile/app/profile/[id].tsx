import React, { useState, useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  View, 
  Alert,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error clerk expo types
import { useUser } from "@clerk/clerk-expo";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Profile } from "../../types";
import { formatAge, formatCity } from "../../utils/formatting";
import { Button, Avatar } from "../../components/ui";
import PlatformButton from "../../components/ui/PlatformButton";
import PlatformCard from "../../components/ui/PlatformCard";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useMatrimonyAppRating } from "../../hooks/useAppRating";
import { useInterests } from "../../hooks/useInterests";
import { useBlockStatus } from "../../hooks/useSafety";
import SafetyActionSheet from "../../components/safety/SafetyActionSheet";

const { width: screenWidth } = Dimensions.get("window");

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const apiClient = useApiClient();
  const rating = useMatrimonyAppRating();
  const { sendInterest, sending } = useInterests();
  const { isBlocked } = useBlockStatus(id);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSafetySheet, setShowSafetySheet] = useState(false);

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get specific profile first
      let response = await apiClient.getProfileById(id!);
      
      // Fallback to search if profile endpoint doesn't exist
      if (!response.success) {
        response = await apiClient.searchProfiles({
          profileId: id,
          pageSize: 1,
        });
      }

      if (response.success) {
        // Handle both profile detail response and search response
        const profileData = response.data?.profile || response.data?.profiles?.[0];
        
        if (profileData) {
          setProfile(profileData);
          
          // Record profile view for app rating
          await rating.recordProfileView();
        } else {
          setError('Profile not found');
        }
      } else {
        setError(response.error || 'Profile not found');
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async () => {
    if (!profile || !user || sending) return;

    try {
      await PlatformHaptics.medium();
      
      const success = await sendInterest(profile.id);
      
      if (success) {
        await PlatformHaptics.success();
        await rating.recordInterest();
        
        Alert.alert(
          "Interest Sent! 💕",
          `Your interest has been sent to ${profile.fullName}. If they're interested too, you'll be matched!`,
          [
            {
              text: "Great!",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        await PlatformHaptics.error();
        Alert.alert("Error", "Failed to send interest. Please try again.");
      }
    } catch (error) {
      console.error("Error sending interest:", error);
      await PlatformHaptics.error();
      Alert.alert("Error", "Failed to send interest. Please try again.");
    }
  };

  const renderImageGallery = () => {
    if (!profile?.profileImageIds?.length) {
      return (
        <View style={styles.placeholderContainer}>
          <Ionicons name="person" size={80} color={Colors.neutral[400]} />
        </View>
      );
    }

    return (
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentImageIndex(index);
          }}
        >
          {profile.profileImageIds.map((imageId, index) => (
            <Image
              key={index}
              source={{ uri: imageId }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {profile.profileImageIds.length > 1 && (
          <View style={styles.imageIndicators}>
            {profile.profileImageIds.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="heart" size={48} color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error[400]} />
          <Text style={styles.errorTitle}>Profile not found</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  const age = formatAge(profile.dateOfBirth);
  const city = formatCity(profile.ukCity);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.safetyButton}
            onPress={() => setShowSafetySheet(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Profile Images */}
        {renderImageGallery()}

        {/* Profile Info */}
        <PlatformCard style={styles.infoCard}>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.age}>{age}</Text>
          </View>

          <View style={styles.locationSection}>
            <Ionicons name="location-outline" size={16} color={Colors.neutral[500]} />
            <Text style={styles.location}>{city}</Text>
          </View>

          {profile.aboutMe && (
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile.aboutMe}</Text>
            </View>
          )}

          {/* Basic Info */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            {profile.occupation && (
              <View style={styles.detailRow}>
                <Ionicons name="briefcase-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{profile.occupation}</Text>
              </View>
            )}
            
            {profile.education && (
              <View style={styles.detailRow}>
                <Ionicons name="school-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{profile.education}</Text>
              </View>
            )}
            
            {profile.height && (
              <View style={styles.detailRow}>
                <Ionicons name="resize-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{profile.height}</Text>
              </View>
            )}

            {profile.religion && (
              <View style={styles.detailRow}>
                <Ionicons name="moon-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{profile.religion}</Text>
              </View>
            )}
          </View>
        </PlatformCard>
      </ScrollView>

      {/* Action Buttons */}
      {!isBlocked && (
        <View style={styles.actionContainer}>
          <PlatformButton
            title="Not Interested"
            variant="outline"
            onPress={() => router.back()}
            style={styles.passButton}
          />
          <PlatformButton
            title="Send Interest 💕"
            onPress={handleSendInterest}
            loading={sending}
            style={styles.interestButton}
          />
        </View>
      )}

      {isBlocked && (
        <View style={styles.blockedContainer}>
          <View style={styles.blockedBanner}>
            <Ionicons name="ban" size={20} color={Colors.error[500]} />
            <Text style={styles.blockedText}>
              You have blocked this user
            </Text>
          </View>
        </View>
      )}

      {/* Safety Action Sheet */}
      <SafetyActionSheet
        visible={showSafetySheet}
        onClose={() => setShowSafetySheet(false)}
        userId={id!}
        userName={profile.fullName}
        isBlocked={isBlocked}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  safetyButton: {
    padding: Layout.spacing.xs,
  },

  imageContainer: {
    position: 'relative',
    height: screenWidth * 1.2,
    backgroundColor: Colors.neutral[100],
  },

  profileImage: {
    width: screenWidth,
    height: screenWidth * 1.2,
  },

  placeholderContainer: {
    height: screenWidth * 1.2,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageIndicators: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    flexDirection: 'row',
    gap: Layout.spacing.xs,
  },

  indicator: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.background.primary,
    opacity: 0.5,
    borderRadius: Layout.radius.xs,
  },

  activeIndicator: {
    opacity: 1,
  },

  infoCard: {
    margin: Layout.spacing.lg,
    marginBottom: 100, // Space for action buttons
  },

  nameSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Layout.spacing.sm,
  },

  name: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },

  age: {
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.sm,
  },

  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.lg,
  },

  location: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },

  bioSection: {
    marginBottom: Layout.spacing.lg,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },

  bio: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.base,
  },

  detailsSection: {
    gap: Layout.spacing.sm,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },

  detailText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },

  loadingText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },

  errorTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },

  errorText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
  },

  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    gap: Layout.spacing.md,
  },

  passButton: {
    flex: 1,
  },

  interestButton: {
    flex: 2,
  },

  blockedContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.error[50],
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.error[200],
    gap: Layout.spacing.sm,
  },

  blockedText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.error[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
});
