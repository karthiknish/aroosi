/**
 * Profile Screen - User profile with editing and settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    colors,
    spacing,
    fontSize,
    fontWeight,
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
} from '@/theme';
import { useAuthStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getProfile, type UserProfile } from '@/services/api/profile';
import { getSubscriptionStatus, type SubscriptionStatusInfo } from '@/services/api/subscription';
import auth from '@react-native-firebase/auth';

export default function ProfileScreen() {
    const { user, signOut } = useAuthStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatusInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Profile stats
    const [stats, setStats] = useState({
        likes: 0,
        matches: 0,
        views: 0,
    });

    // Load profile data
    const loadProfile = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const [profileRes, subscriptionRes] = await Promise.all([
                getProfile(),
                getSubscriptionStatus(),
            ]);

            if (profileRes.data) {
                setProfile(profileRes.data);
            }

            if (subscriptionRes.data) {
                setSubscription(subscriptionRes.data);
            }

            // Fetch profile stats
            try {
                const { getReceivedInterests } = await import('@/services/api/interests');
                const { getMatches } = await import('@/services/api/matches');
                const { getProfileViewCount } = await import('@/services/api/profileViewers');

                // Get user ID for profile view count
                const userId = auth().currentUser?.uid;

                const [interestsRes, matchesRes, viewsRes] = await Promise.all([
                    userId ? getReceivedInterests(userId) : Promise.resolve({ data: null }),
                    getMatches(),
                    userId ? getProfileViewCount(userId) : Promise.resolve({ data: null }),
                ]);

                setStats({
                    likes: interestsRes.data?.length || 0,
                    matches: matchesRes.data?.length || 0,
                    views: viewsRes.data?.count || 0,
                });
            } catch (statsErr) {
                console.log('Stats fetch failed:', statsErr);
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Handle sign out
    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => signOut(),
                },
            ]
        );
    };

    // Handle menu item press
    const handleMenuPress = (item: string) => {
        switch (item) {
            case 'Edit Profile':
            case 'Edit Photos':
                router.push('/edit-profile');
                break;
            case 'Preferences':
                router.push('/preferences');
                break;
            case 'Settings':
                router.push('/settings');
                break;
            case 'Subscription':
                router.push('/subscription');
                break;
            case 'Quick Picks':
                router.push('/quick-picks');
                break;
            case 'Shortlists':
                router.push('/shortlists');
                break;
            case 'Icebreakers':
                router.push('/icebreakers');
                break;
            case 'Interests':
                router.push('/interests');
                break;
            case 'Profile Viewers':
                router.push('/profile-viewers');
                break;
            case 'Blocked Users':
                router.push('/blocked-users');
                break;
            default:
                Alert.alert('Coming Soon', `${item} will be available soon!`);
        }
    };

    // Get profile completion percentage
    const getProfileCompletion = () => {
        if (!profile) return 0;
        let completed = 0;
        const fields = [
            'displayName',
            'bio',
            'age',
            'gender',
            'location',
            'photos',
            'interests',
            'education',
            'occupation',
            'maritalStatus',
            'religion',
            'motherTongue',
            'height'
        ];
        fields.forEach(field => {
            const value = (profile as any)[field];
            if (value && (Array.isArray(value) ? value.length > 0 : true)) {
                completed++;
            }
        });
        return Math.round((completed / fields.length) * 100);
    };

    const profileCompletion = getProfileCompletion();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>
                <LoadingSpinner message="Loading profile..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => handleMenuPress('Settings')}
                >
                    <SymbolView
                        name="gear"
                        weight="medium"
                        tintColor={colors.neutral[600]}
                        size={22}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadProfile(true)}
                        tintColor={colors.primary.DEFAULT}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => handleMenuPress('Edit Photos')}
                    >
                        {profile?.photoURL || (profile?.photos && profile.photos.length > 0) ? (
                            <Image
                                source={{ uri: profile?.photos?.[0] || profile?.photoURL || '' }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || '👤'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.editAvatarBadge}>
                            <Text style={styles.editAvatarIcon}>📷</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Name & Info */}
                    <Text style={styles.name}>
                        {profile?.displayName || user?.displayName || 'Your Name'}
                        {profile?.age ? `, ${profile.age}` : ''}
                    </Text>

                    {profile?.location?.city && (
                        <Text style={styles.location}>
                            📍 {profile.location.city}
                            {profile.location.state ? `, ${profile.location.state}` : ''}
                        </Text>
                    )}

                    {/* Profile Completion */}
                    {profileCompletion < 100 && (
                        <View style={styles.completionContainer}>
                            <View style={styles.completionBar}>
                                <View style={[styles.completionFill, { width: `${profileCompletion}%` }]} />
                            </View>
                            <Text style={styles.completionText}>
                                {profileCompletion}% complete
                            </Text>
                        </View>
                    )}

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <TouchableOpacity style={styles.statItem} onPress={() => handleMenuPress('Interests')}>
                            <Text style={styles.statValue}>{stats.likes}</Text>
                            <Text style={styles.statLabel}>Likes</Text>
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => handleMenuPress('Shortlists')}>
                            <Text style={styles.statValue}>{stats.matches}</Text>
                            <Text style={styles.statLabel}>Matches</Text>
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => handleMenuPress('Profile Viewers')}>
                            <Text style={styles.statValue}>{stats.views}</Text>
                            <Text style={styles.statLabel}>Views</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Subscription Banner */}
                {subscription && subscription.plan === 'free' && (
                    <TouchableOpacity
                        style={styles.subscriptionBanner}
                        onPress={() => handleMenuPress('Subscription')}
                    >
                        <View style={styles.subscriptionContent}>
                            <SymbolView
                                name="star.fill"
                                tintColor="#FFD700"
                                size={20}
                            />
                            <View style={styles.subscriptionText}>
                                <Text style={styles.subscriptionTitle}>Go Premium</Text>
                                <Text style={styles.subscriptionDesc}>Unlock all features</Text>
                            </View>
                        </View>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>
                )}

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Profile</Text>

                    <MenuItem icon="person.fill" label="Edit Profile" onPress={() => handleMenuPress('Edit Profile')} />
                    <MenuItem icon="camera.fill" label="Edit Photos" onPress={() => handleMenuPress('Edit Photos')} />
                    <MenuItem icon="heart.fill" label="Preferences" onPress={() => handleMenuPress('Preferences')} />
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Engagement</Text>

                    <MenuItem icon="bolt.fill" label="Quick Picks" onPress={() => handleMenuPress('Quick Picks')} />
                    <MenuItem icon="star.fill" label="Shortlists" onPress={() => handleMenuPress('Shortlists')} />
                    <MenuItem icon="message.fill" label="Icebreakers" onPress={() => handleMenuPress('Icebreakers')} />
                    <MenuItem icon="heart.fill" label="Interests" onPress={() => handleMenuPress('Interests')} />
                    <MenuItem icon="eye.fill" label="Profile Viewers" onPress={() => handleMenuPress('Profile Viewers')} />
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Account</Text>

                    <MenuItem icon="lock.fill" label="Blocked Users" onPress={() => handleMenuPress('Blocked Users')} />
                    <MenuItem icon="gear" label="Settings" onPress={() => handleMenuPress('Settings')} />
                    <MenuItem
                        icon="arrow.right.square"
                        label="Sign Out"
                        onPress={handleSignOut}
                        textStyle={styles.signOutText}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Menu Item Component
interface MenuItemProps {
    icon: string;
    label: string;
    onPress: () => void;
    textStyle?: any;
}

function MenuItem({ icon, label, onPress, textStyle }: MenuItemProps) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <SymbolView
                name={icon as any}
                weight="medium"
                tintColor={colors.neutral[600]}
                size={20}
            />
            <Text style={[styles.menuLabel, textStyle]}>{label}</Text>
            <SymbolView
                name="chevron.right"
                weight="medium"
                tintColor={colors.neutral[400]}
                size={16}
            />
        </TouchableOpacity>
    );
}

// Responsive avatar size
const AVATAR_SIZE = isSmallDevice ? 80 : 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    title: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    settingsButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        margin: responsiveValues.screenPadding,
        borderRadius: borderRadius.xl,
        padding: moderateScale(20),
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: moderateScale(16),
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    editAvatarIcon: {
        fontSize: moderateScale(14),
    },
    name: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    location: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginBottom: moderateScale(16),
    },
    completionContainer: {
        width: '100%',
        marginBottom: moderateScale(16),
    },
    completionBar: {
        height: moderateScale(6),
        backgroundColor: colors.neutral[200],
        borderRadius: moderateScale(3),
        overflow: 'hidden',
        marginBottom: moderateScale(8),
    },
    completionFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
    },
    completionText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[500],
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        width: '100%',
        paddingTop: moderateScale(16),
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    statLabel: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[500],
        marginTop: moderateScale(4),
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.neutral[100],
    },
    subscriptionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.warning + '15',
        marginHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(16),
                        padding: moderateScale(16),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.warning + '30',
    },
    subscriptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: moderateScale(12),
    },
    subscriptionText: {
        flex: 1,
    },
    subscriptionTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    subscriptionDesc: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    menuSection: {
        marginBottom: moderateScale(24),
    },
    menuSectionTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(8),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(14),
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        gap: moderateScale(12),
    },
    menuLabel: {
        flex: 1,
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
    },
    signOutText: {
        color: colors.error,
    },
});
