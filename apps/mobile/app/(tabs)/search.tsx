import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanGestureHandler,
  State,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error deck swiper types
import Swiper from "react-native-deck-swiper";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Avatar } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Profile } from "../../types";
import { formatAge, formatCity } from "../../utils/formatting";
// @ts-expect-error clerk expo types
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMatrimonyAppRating } from "../../hooks/useAppRating";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useStorage } from "../../utils/storage";
import { SearchFilters } from "../../types";
import { useInterests } from "../../hooks/useInterests";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function SearchScreen() {
  const apiClient = useApiClient();
  const { user } = useUser();
  const storage = useStorage();
  const { sendInterest } = useInterests();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const swiperRef = useRef<any>(null);
  const rating = useMatrimonyAppRating();

  useEffect(() => {
    loadFiltersAndProfiles();
  }, []);

  // Listen for focus to reload when returning from filters
  useEffect(() => {
    const unsubscribe = router.subscribe?.(() => {
      // Reload when returning from filters screen
      loadFiltersAndProfiles();
    });
    
    return unsubscribe;
  }, []);

  const loadFiltersAndProfiles = async () => {
    await loadSavedFilters();
    await loadProfiles();
  };

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await storage.getItem("search_filters");
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert UI filters to API format
      const searchParams = {
        page: 0,
        pageSize: 10,
        ...formatFiltersForAPI(filters),
      };
      
      const response = await apiClient.searchProfiles(searchParams);

      if (response.success && response.data?.profiles) {
        setProfiles(response.data.profiles);
        setCurrentIndex(0);
        await PlatformHaptics.light();
      } else {
        setError(response.error || 'Failed to load profiles');
        await PlatformHaptics.error();
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
      setError('Network error. Please check your connection.');
      await PlatformHaptics.error();
    } finally {
      setLoading(false);
    }
  };

  const formatFiltersForAPI = (filters: SearchFilters) => {
    const apiFilters: any = {};
    
    if (filters.ageMin && filters.ageMin !== 'any') {
      apiFilters.ageMin = parseInt(filters.ageMin);
    }
    if (filters.ageMax && filters.ageMax !== 'any') {
      apiFilters.ageMax = parseInt(filters.ageMax);
    }
    if (filters.city && filters.city !== 'any') {
      apiFilters.city = filters.city;
    }
    if (filters.education && filters.education !== 'any') {
      apiFilters.education = filters.education;
    }
    if (filters.occupation && filters.occupation !== 'any') {
      apiFilters.occupation = filters.occupation;
    }
    if (filters.maritalStatus && filters.maritalStatus !== 'any') {
      apiFilters.maritalStatus = filters.maritalStatus;
    }
    if (filters.religion && filters.religion !== 'any') {
      apiFilters.religion = filters.religion;
    }
    
    return apiFilters;
  };

  const loadMoreProfiles = async () => {
    if (loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = Math.floor(profiles.length / 10);
      
      const searchParams = {
        page: nextPage,
        pageSize: 10,
        ...formatFiltersForAPI(filters),
      };
      
      const response = await apiClient.searchProfiles(searchParams);

      if (response.success && response.data?.profiles) {
        setProfiles(prev => [...prev, ...response.data.profiles]);
      }
    } catch (error) {
      console.error("Error loading more profiles:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSwipeLeft = async (cardIndex: number) => {
    const profile = profiles[cardIndex];
    if (!profile) return;

    console.log("Swiped left on:", profile.fullName);
    await PlatformHaptics.light();
    
    // Record significant event for app rating
    await rating.recordSignificantEvent('profile_viewed');
  };

  const handleSwipeRight = async (cardIndex: number) => {
    const profile = profiles[cardIndex];
    if (!profile || !user) return;

    console.log("Swiped right on:", profile.fullName);
    
    try {
      await PlatformHaptics.medium();
      
      // Send interest using the hook
      const success = await sendInterest(profile.id);
      
      if (success) {
        console.log("Interest sent successfully");
        await PlatformHaptics.success();
        
        // Record significant events for app rating
        await rating.recordInterest();
      } else {
        console.error("Failed to send interest");
        await PlatformHaptics.error();
      }
    } catch (error) {
      console.error("Error sending interest:", error);
      await PlatformHaptics.error();
    }
  };

  const handleCardPress = async (cardIndex: number) => {
    const profile = profiles[cardIndex];
    if (!profile) return;

    console.log("Pressed on profile:", profile.fullName);
    await PlatformHaptics.light();
    
    // Record profile view for app rating
    await rating.recordProfileView();
    
    // Navigate to profile detail
    router.push(`/profile/${profile.id}`);
  };

  const renderProfileCard = (profile: Profile, index: number) => {
    const age = formatAge(profile.dateOfBirth);
    const city = formatCity(profile.ukCity);
    const primaryImage = profile.profileImageIds?.[0];

    return (
      <Card
        key={profile.id}
        style={styles.card}
        onPress={() => handleCardPress(index)}
      >
        <View style={styles.cardContent}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            {primaryImage ? (
              <Avatar
                uri={primaryImage}
                size="2xl"
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={60} color={Colors.neutral[400]} />
              </View>
            )}
            
            {/* Image Indicators */}
            {profile.profileImageIds?.length > 1 && (
              <View style={styles.imageIndicators}>
                {profile.profileImageIds.map((_, imgIndex) => (
                  <View
                    key={imgIndex}
                    style={[
                      styles.indicator,
                      imgIndex === 0 && styles.activeIndicator,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.fullName}
              </Text>
              <Text style={styles.age}>{age}</Text>
            </View>

            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={Colors.neutral[500]} />
              <Text style={styles.location} numberOfLines={1}>
                {city}
              </Text>
            </View>

            <Text style={styles.bio} numberOfLines={3}>
              {profile.aboutMe}
            </Text>

            {/* Quick Info Tags */}
            <View style={styles.tagsContainer}>
              {profile.occupation && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{profile.occupation}</Text>
                </View>
              )}
              {profile.education && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{profile.education}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No more profiles</Text>
      <Text style={styles.emptySubtitle}>
        Check back later for new matches!
      </Text>
      <Button
        title="Refresh"
        onPress={loadProfiles}
        variant="outline"
        style={styles.refreshButton}
        loading={loading}
      />
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={Colors.error[400]} />
      <Text style={styles.emptyTitle}>Oops! Something went wrong</Text>
      <Text style={styles.emptySubtitle}>
        {error || 'Unable to load profiles. Please try again.'}
      </Text>
      <Button
        title="Try Again"
        onPress={loadProfiles}
        variant="primary"
        style={styles.refreshButton}
        loading={loading}
      />
    </View>
  );

  if (loading && profiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="heart" size={48} color={Colors.primary[500]} style={styles.loadingIcon} />
          <Text style={styles.loadingText}>Finding amazing people for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Button
          title="Filters"
          variant="ghost"
          size="sm"
          icon={<Ionicons name="options-outline" size={20} color={Colors.primary[500]} />}
          onPress={() => {
            router.push("/search-filters");
          }}
        />
      </View>

      {/* Swiper */}
      <View style={styles.swiperContainer}>
        {error ? (
          renderErrorState()
        ) : profiles.length > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={profiles}
            renderCard={renderProfileCard}
            onSwipedLeft={handleSwipeLeft}
            onSwipedRight={handleSwipeRight}
            onSwipedAll={() => setCurrentIndex(profiles.length)}
            cardIndex={currentIndex}
            backgroundColor="transparent"
            stackSize={2}
            stackSeparation={15}
            animateCardOpacity
            swipeBackCard
            onSwipedAborted={() => {
              // Handle swipe abort
            }}
            onTapCard={(cardIndex) => handleCardPress(cardIndex)}
            verticalSwipe={false}
            horizontalSwipe={true}
            // Load more when approaching end
            onSwiped={(cardIndex) => {
              setCurrentIndex(cardIndex + 1);
              if (cardIndex >= profiles.length - 3) {
                loadMoreProfiles();
              }
            }}
          />
        ) : (
          renderEmptyState()
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          title=""
          variant="secondary"
          size="lg"
          icon={<Ionicons name="close" size={28} color={Colors.error[500]} />}
          style={styles.actionButton}
          onPress={() => swiperRef.current?.swipeLeft()}
        />
        <Button
          title=""
          variant="secondary"
          size="lg"
          icon={<Ionicons name="star" size={24} color={Colors.warning[500]} />}
          style={styles.actionButton}
          onPress={() => {
            // Super like functionality
          }}
        />
        <Button
          title=""
          variant="primary"
          size="lg"
          icon={<Ionicons name="heart" size={28} color={Colors.background.primary} />}
          style={styles.actionButton}
          onPress={() => swiperRef.current?.swipeRight()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },

  loadingIcon: {
    marginBottom: Layout.spacing.lg,
  },

  loadingText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  headerTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  
  swiperContainer: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
  },
  
  card: {
    height: screenHeight * 0.6,
    borderRadius: Layout.radius.xl,
    elevation: 8,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  
  cardContent: {
    flex: 1,
  },
  
  imageContainer: {
    flex: 1,
    position: "relative",
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    overflow: "hidden",
  },
  
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  
  placeholderImage: {
    flex: 1,
    backgroundColor: Colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
  },
  
  imageIndicators: {
    position: "absolute",
    top: Layout.spacing.md,
    left: Layout.spacing.md,
    right: Layout.spacing.md,
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
  
  profileInfo: {
    padding: Layout.spacing.lg,
  },
  
  nameContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Layout.spacing.xs,
  },
  
  name: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  
  age: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.sm,
  },
  
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.md,
  },
  
  location: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    flex: 1,
  },
  
  bio: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.base,
    marginBottom: Layout.spacing.md,
  },
  
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.xs,
  },
  
  tag: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
  },
  
  tagText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  
  emptySubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Layout.spacing.xl,
  },
  
  refreshButton: {
    paddingHorizontal: Layout.spacing.xl,
  },
  
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.lg,
    gap: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
  },
  
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});