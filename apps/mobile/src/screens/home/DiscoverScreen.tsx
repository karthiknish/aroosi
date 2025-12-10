/**
 * Discover Screen - Browse and search profiles
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { ProfileGridItem } from '../../components/ProfileGridItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    searchProfiles,
    getRecommendations,
    type RecommendedProfile,
    type SearchFilters,
} from '../../services/api/recommendations';

type DiscoverNavigation = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoverMain'>;

const FILTER_OPTIONS = {
    ageRanges: [
        { label: '18-25', min: 18, max: 25 },
        { label: '26-35', min: 26, max: 35 },
        { label: '36-45', min: 36, max: 45 },
        { label: '46+', min: 46, max: 100 },
    ],
    distances: [
        { label: '10 km', value: 10 },
        { label: '25 km', value: 25 },
        { label: '50 km', value: 50 },
        { label: '100 km', value: 100 },
        { label: 'Any', value: undefined },
    ],
    // Premium filters
    ethnicities: [
        { label: 'Any', value: undefined },
        { label: 'South Asian', value: 'south_asian' },
        { label: 'Middle Eastern', value: 'middle_eastern' },
        { label: 'East Asian', value: 'east_asian' },
        { label: 'African', value: 'african' },
        { label: 'European', value: 'european' },
        { label: 'Latin American', value: 'latin_american' },
        { label: 'Other', value: 'other' },
    ],
    motherTongues: [
        { label: 'Any', value: undefined },
        { label: 'English', value: 'english' },
        { label: 'Hindi', value: 'hindi' },
        { label: 'Urdu', value: 'urdu' },
        { label: 'Punjabi', value: 'punjabi' },
        { label: 'Tamil', value: 'tamil' },
        { label: 'Telugu', value: 'telugu' },
        { label: 'Bengali', value: 'bengali' },
        { label: 'Gujarati', value: 'gujarati' },
        { label: 'Arabic', value: 'arabic' },
        { label: 'Other', value: 'other' },
    ],
    languages: [
        { label: 'Any', value: undefined },
        { label: 'English', value: 'english' },
        { label: 'Hindi', value: 'hindi' },
        { label: 'Urdu', value: 'urdu' },
        { label: 'Arabic', value: 'arabic' },
        { label: 'French', value: 'french' },
        { label: 'Spanish', value: 'spanish' },
        { label: 'Other', value: 'other' },
    ],
};

export default function DiscoverScreen() {
    const navigation = useNavigation<DiscoverNavigation>();
    const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [error, setError] = useState<string | null>(null);
    const [isPremium, setIsPremium] = useState(false);

    // Check subscription status on mount
    useEffect(() => {
        const checkPremium = async () => {
            try {
                const { getSubscriptionStatus } = await import('../../services/api/subscription');
                const response = await getSubscriptionStatus();
                if (response.data) {
                    const plan = response.data.plan?.toLowerCase() || 'free';
                    setIsPremium(plan === 'premium' || plan === 'premiumplus');
                }
            } catch {
                // Default to non-premium
            }
        };
        checkPremium();
    }, []);

    // Load profiles
    const loadProfiles = useCallback(async (isRefresh = false, query?: string) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            let response;
            if (query || Object.keys(filters).length > 0) {
                response = await searchProfiles(query || '', filters);
            } else {
                response = await getRecommendations(50);
            }

            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.data) {
                setProfiles(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profiles');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    // Handle search
    const handleSearch = useCallback(() => {
        loadProfiles(false, searchQuery);
    }, [loadProfiles, searchQuery]);

    // Handle profile press
    const handleProfilePress = useCallback((profile: RecommendedProfile) => {
        navigation.navigate('ProfileDetail', { userId: profile.id });
    }, [navigation]);

    // Apply filters
    const applyFilters = useCallback(() => {
        setShowFilters(false);
        loadProfiles(false, searchQuery);
    }, [loadProfiles, searchQuery]);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({});
        setSearchQuery('');
    }, []);

    // Render profile item
    const renderItem = useCallback(({ item }: { item: RecommendedProfile }) => (
        <ProfileGridItem
            profile={item}
            onPress={() => handleProfilePress(item)}
        />
    ), [handleProfilePress]);

    // Render loading state
    if (loading && profiles.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Discover</Text>
                </View>
                <LoadingSpinner message="Finding people near you..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Discover</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or interests..."
                        placeholderTextColor={colors.neutral[400]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(true)}
                >
                    <Text style={styles.filterIcon}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* Active Filters */}
            {Object.keys(filters).length > 0 && (
                <View style={styles.activeFilters}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {filters.ageRange && (
                            <View style={styles.filterTag}>
                                <Text style={styles.filterTagText}>
                                    Age: {filters.ageRange.min}-{filters.ageRange.max}
                                </Text>
                            </View>
                        )}
                        {filters.distance && (
                            <View style={styles.filterTag}>
                                <Text style={styles.filterTagText}>
                                    {filters.distance} km
                                </Text>
                            </View>
                        )}
                        {filters.verified && (
                            <View style={styles.filterTag}>
                                <Text style={styles.filterTagText}>Verified only</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.clearFiltersButton}
                            onPress={clearFilters}
                        >
                            <Text style={styles.clearFiltersText}>Clear</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Error State */}
            {error && (
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadProfiles()}
                />
            )}

            {/* Profile Grid */}
            {!error && (
                <FlatList
                    data={profiles}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.gridContent}
                    columnWrapperStyle={styles.gridRow}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadProfiles(true, searchQuery)}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            emoji="🔍"
                            title="No profiles found"
                            message="Try adjusting your search or filters"
                            actionLabel="Clear Filters"
                            onAction={clearFilters}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowFilters(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Text style={styles.modalClose}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Filters</Text>
                        <TouchableOpacity onPress={applyFilters}>
                            <Text style={styles.modalApply}>Apply</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Age Range */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Age Range</Text>
                            <View style={styles.filterOptions}>
                                {FILTER_OPTIONS.ageRanges.map((option) => (
                                    <TouchableOpacity
                                        key={option.label}
                                        style={[
                                            styles.filterOption,
                                            filters.ageRange?.min === option.min &&
                                            styles.filterOptionActive
                                        ]}
                                        onPress={() => setFilters(prev => ({
                                            ...prev,
                                            ageRange: { min: option.min, max: option.max }
                                        }))}
                                    >
                                        <Text style={[
                                            styles.filterOptionText,
                                            filters.ageRange?.min === option.min &&
                                            styles.filterOptionTextActive
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Distance */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Maximum Distance</Text>
                            <View style={styles.filterOptions}>
                                {FILTER_OPTIONS.distances.map((option) => (
                                    <TouchableOpacity
                                        key={option.label}
                                        style={[
                                            styles.filterOption,
                                            filters.distance === option.value &&
                                            styles.filterOptionActive
                                        ]}
                                        onPress={() => setFilters(prev => ({
                                            ...prev,
                                            distance: option.value
                                        }))}
                                    >
                                        <Text style={[
                                            styles.filterOptionText,
                                            filters.distance === option.value &&
                                            styles.filterOptionTextActive
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Verified Only */}
                        <View style={styles.filterSection}>
                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setFilters(prev => ({
                                    ...prev,
                                    verified: !prev.verified
                                }))}
                            >
                                <Text style={styles.filterSectionTitle}>Verified profiles only</Text>
                                <View style={[
                                    styles.toggle,
                                    filters.verified && styles.toggleActive
                                ]}>
                                    <View style={[
                                        styles.toggleKnob,
                                        filters.verified && styles.toggleKnobActive
                                    ]} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Premium Filters Section */}
                        <View style={styles.filterSection}>
                            <View style={styles.premiumHeader}>
                                <Text style={styles.filterSectionTitle}>Advanced Filters</Text>
                                {!isPremium && (
                                    <View style={styles.premiumBadge}>
                                        <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
                                    </View>
                                )}
                            </View>

                            {/* Ethnicity Filter */}
                            <View style={[styles.premiumFilterGroup, !isPremium && styles.premiumFilterLocked]}>
                                <Text style={styles.premiumFilterLabel}>
                                    Ethnicity {!isPremium && '🔒'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.filterOptions}>
                                        {FILTER_OPTIONS.ethnicities.map((option) => (
                                            <TouchableOpacity
                                                key={option.label}
                                                style={[
                                                    styles.filterOption,
                                                    (filters as any).ethnicity === option.value &&
                                                    styles.filterOptionActive,
                                                    !isPremium && styles.filterOptionDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isPremium) {
                                                        setFilters(prev => ({
                                                            ...prev,
                                                            ethnicity: option.value
                                                        } as SearchFilters));
                                                    }
                                                }}
                                                disabled={!isPremium}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    (filters as any).ethnicity === option.value &&
                                                    styles.filterOptionTextActive
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Mother Tongue Filter */}
                            <View style={[styles.premiumFilterGroup, !isPremium && styles.premiumFilterLocked]}>
                                <Text style={styles.premiumFilterLabel}>
                                    Mother Tongue {!isPremium && '🔒'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.filterOptions}>
                                        {FILTER_OPTIONS.motherTongues.map((option) => (
                                            <TouchableOpacity
                                                key={option.label}
                                                style={[
                                                    styles.filterOption,
                                                    (filters as any).motherTongue === option.value &&
                                                    styles.filterOptionActive,
                                                    !isPremium && styles.filterOptionDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isPremium) {
                                                        setFilters(prev => ({
                                                            ...prev,
                                                            motherTongue: option.value
                                                        } as SearchFilters));
                                                    }
                                                }}
                                                disabled={!isPremium}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    (filters as any).motherTongue === option.value &&
                                                    styles.filterOptionTextActive
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Language Filter */}
                            <View style={[styles.premiumFilterGroup, !isPremium && styles.premiumFilterLocked]}>
                                <Text style={styles.premiumFilterLabel}>
                                    Language {!isPremium && '🔒'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.filterOptions}>
                                        {FILTER_OPTIONS.languages.map((option) => (
                                            <TouchableOpacity
                                                key={option.label}
                                                style={[
                                                    styles.filterOption,
                                                    (filters as any).language === option.value &&
                                                    styles.filterOptionActive,
                                                    !isPremium && styles.filterOptionDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isPremium) {
                                                        setFilters(prev => ({
                                                            ...prev,
                                                            language: option.value
                                                        } as SearchFilters));
                                                    }
                                                }}
                                                disabled={!isPremium}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    (filters as any).language === option.value &&
                                                    styles.filterOptionTextActive
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>

                        {/* Clear All */}
                        <TouchableOpacity
                            style={styles.clearAllButton}
                            onPress={() => setFilters({})}
                        >
                            <Text style={styles.clearAllText}>Clear All Filters</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        gap: spacing[3],
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing[3],
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing[2],
    },
    searchInput: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.neutral[900],
        paddingVertical: spacing[3],
    },
    clearIcon: {
        fontSize: 16,
        color: colors.neutral[400],
        padding: spacing[2],
    },
    filterButton: {
        width: 48,
        height: 48,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterIcon: {
        fontSize: 20,
    },
    activeFilters: {
        paddingHorizontal: spacing[4],
        paddingBottom: spacing[3],
    },
    filterTag: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.full,
        marginRight: spacing[2],
    },
    filterTagText: {
        fontSize: fontSize.sm,
        color: colors.primary.DEFAULT,
    },
    clearFiltersButton: {
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
    },
    clearFiltersText: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    gridContent: {
        paddingHorizontal: spacing[4],
        paddingTop: spacing[2],
        paddingBottom: spacing[6],
    },
    gridRow: {
        justifyContent: 'space-between',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    modalClose: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
    },
    modalTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    modalApply: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
    },
    modalContent: {
        flex: 1,
        padding: spacing[4],
    },
    filterSection: {
        marginBottom: spacing[6],
    },
    filterSectionTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
        marginBottom: spacing[3],
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing[2],
    },
    filterOption: {
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.full,
    },
    filterOptionActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    filterOptionText: {
        fontSize: fontSize.sm,
        color: colors.neutral[600],
    },
    filterOptionTextActive: {
        color: '#FFFFFF',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggle: {
        width: 50,
        height: 30,
        backgroundColor: colors.neutral[200],
        borderRadius: 15,
        padding: 2,
    },
    toggleActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    toggleKnob: {
        width: 26,
        height: 26,
        backgroundColor: '#FFFFFF',
        borderRadius: 13,
    },
    toggleKnobActive: {
        transform: [{ translateX: 20 }],
    },
    clearAllButton: {
        alignItems: 'center',
        paddingVertical: spacing[4],
        marginTop: spacing[4],
    },
    clearAllText: {
        fontSize: fontSize.base,
        color: colors.error,
    },
    // Premium filter styles
    premiumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[4],
    },
    premiumBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.md,
    },
    premiumBadgeText: {
        fontSize: fontSize.xs,
        color: colors.warning,
        fontWeight: fontWeight.medium,
    },
    premiumFilterGroup: {
        marginBottom: spacing[4],
    },
    premiumFilterLocked: {
        opacity: 0.6,
    },
    premiumFilterLabel: {
        fontSize: fontSize.sm,
        color: colors.neutral[600],
        marginBottom: spacing[2],
    },
    filterOptionDisabled: {
        backgroundColor: colors.neutral[100],
    },
});
