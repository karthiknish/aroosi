import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Avatar } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { Profile } from "../types";
import { 
  formatAge, 
  formatCity, 
  formatEducation, 
  formatMaritalStatus,
  formatSmokingDrinking,
  formatHeight
} from "../utils/formatting";

const { width: screenWidth } = Dimensions.get("window");

export default function ProfileDetailScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const apiClient = useApiClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sendingInterest, setSendingInterest] = useState(false);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // TODO: Load profile by ID
      // For now, using mock data
      const mockProfile: Profile = {
        id: profileId,
        fullName: "Sarah Johnson",
        dateOfBirth: "1995-03-15",
        gender: "female",
        ukCity: "London, UK",
        aboutMe: "I'm a passionate marketing professional who loves exploring new cultures through travel and food. When I'm not working, you'll find me hiking in the countryside, trying out new recipes, or curled up with a good book. I believe in living life to the fullest and making genuine connections with people who share similar values.",
        occupation: "Marketing Manager",
        education: "bachelors",
        height: "5'6\"",
        maritalStatus: "single",
        smoking: "no",
        drinking: "occasionally",
        religion: "Christian",
        profileImageIds: [
          "https://picsum.photos/400/600?random=1",
          "https://picsum.photos/400/600?random=2",
          "https://picsum.photos/400/600?random=3",
        ],
        isProfileComplete: true,
        profileFor: "self",
        createdAt: "",
        updatedAt: "",
      };
      
      setProfile(mockProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async () => {
    if (!profile) return;
    
    setSendingInterest(true);
    try {
      const response = await apiClient.sendInterest(profile.id, "current-user-id"); // TODO: Get current user ID
      if (response.success) {
        Alert.alert("Interest Sent!", "Your interest has been sent successfully.");
        router.back();
      } else {
        Alert.alert("Error", response.error || "Failed to send interest");
      }
    } catch (error) {
      console.error("Error sending interest:", error);
      Alert.alert("Error", "Failed to send interest. Please try again.");
    } finally {
      setSendingInterest(false);
    }
  };

  const handleMessage = () => {
    // TODO: Check if matched, then navigate to chat
    Alert.alert("Match Required", "You need to match with this person before sending messages.");
  };

  const renderImageCarousel = () => {
    if (!profile?.profileImageIds?.length) {
      return (
        <View style={styles.placeholderImage}>
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
          onScroll={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / screenWidth
            );
            setCurrentImageIndex(slideIndex);
          }}
          scrollEventThrottle={16}
        >
          {profile.profileImageIds.map((imageUri, index) => (
            <Avatar
              key={index}
              uri={imageUri}
              style={styles.profileImage}
            />
          ))}
        </ScrollView>

        {/* Image Indicators */}
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

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.text.inverse} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}

        <View style={styles.content}>
          {/* Basic Info */}
          <Card style={styles.infoCard}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{profile.fullName}</Text>
              <Text style={styles.age}>{formatAge(profile.dateOfBirth)}</Text>
            </View>

            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={18} color={Colors.neutral[500]} />
              <Text style={styles.location}>{formatCity(profile.ukCity)}</Text>
            </View>

            <Text style={styles.bio}>{profile.aboutMe}</Text>
          </Card>

          {/* Details */}
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            <DetailRow
              icon="briefcase-outline"
              label="Occupation"
              value={profile.occupation}
            />
            <DetailRow
              icon="school-outline"
              label="Education"
              value={formatEducation(profile.education)}
            />
            <DetailRow
              icon="resize-outline"
              label="Height"
              value={formatHeight(profile.height)}
            />
            <DetailRow
              icon="heart-outline"
              label="Marital Status"
              value={formatMaritalStatus(profile.maritalStatus)}
            />
            {profile.religion && (
              <DetailRow
                icon="leaf-outline"
                label="Religion"
                value={profile.religion}
              />
            )}
            <DetailRow
              icon="wine-outline"
              label="Drinking"
              value={formatSmokingDrinking(profile.drinking)}
            />
            <DetailRow
              icon="ban-outline"
              label="Smoking"
              value={formatSmokingDrinking(profile.smoking)}
            />
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Button
              title="Pass"
              variant="outline"
              icon={<Ionicons name="close" size={24} color={Colors.error[500]} />}
              onPress={() => router.back()}
              style={styles.actionButton}
            />
            
            <Button
              title="Message"
              variant="secondary"
              icon={<Ionicons name="chatbubble-outline" size={20} color={Colors.primary[500]} />}
              onPress={handleMessage}
              style={styles.actionButton}
            />
            
            <Button
              title="Like"
              variant="primary"
              icon={<Ionicons name="heart" size={20} color={Colors.text.inverse} />}
              onPress={handleSendInterest}
              loading={sendingInterest}
              disabled={sendingInterest}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={20} color={Colors.neutral[500]} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
    gap: Layout.spacing.lg,
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  imageContainer: {
    height: screenWidth * 1.2,
    position: "relative",
  },
  
  profileImage: {
    width: screenWidth,
    height: screenWidth * 1.2,
    borderRadius: 0,
  },
  
  placeholderImage: {
    width: screenWidth,
    height: screenWidth * 1.2,
    backgroundColor: Colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
  },
  
  imageIndicators: {
    position: "absolute",
    top: Layout.spacing.lg,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    flexDirection: "row",
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
  
  backButton: {
    position: "absolute",
    top: Layout.spacing.lg,
    left: Layout.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  content: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.lg,
  },
  
  infoCard: {
    padding: Layout.spacing.lg,
  },
  
  nameContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Layout.spacing.sm,
  },
  
  name: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  
  age: {
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.sm,
  },
  
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.lg,
  },
  
  location: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  bio: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.base,
  },
  
  detailsCard: {
    padding: Layout.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  detailContent: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  detailLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  detailValue: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginTop: Layout.spacing.xs,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  actionContainer: {
    flexDirection: "row",
    gap: Layout.spacing.md,
    paddingBottom: Layout.spacing.xl,
  },
  
  actionButton: {
    flex: 1,
  },
});