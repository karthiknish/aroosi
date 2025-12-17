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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
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
} from '../../theme';
import { useAuthStore } from '../../store';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { getProfile, type UserProfile } from '../../services/api/profile';
import { getSubscriptionStatus, type SubscriptionStatusInfo } from '../../services/api/subscription';

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavigation>();
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
                const { getReceivedInterests } = await import('../../services/api/interests');
                const { getMatches } = await import('../../services/api/matches');
                const { getProfileViewCount } = await import('../../services/api/profileViewers');
                
                const [interestsRes, matchesRes, viewsRes] = await Promise.all([
                    getReceivedInterests(),
                    getMatches(),
                    getProfileViewCount(),
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
                navigation.navigate('EditProfile');
                break;
            case 'Preferences':
                navigation.navigate('Preferences');
                break;
            case 'Settings':
                navigation.navigate('Settings');
                break;
            case 'Subscription':
                navigation.navigate('Subscription');
                break;
            // New engagement screens
            case 'Quick Picks':
                navigation.navigate('QuickPicks');
                break;
            case 'Shortlists':
                navigation.navigate('Shortlists');
                break;
            case 'Icebreakers':
                navigation.navigate('Icebreakers');
                break;
            case 'Interests':
                navigation.navigate('Interests');
                break;
            case 'Profile Viewers':
                navigation.navigate('ProfileViewers');
                break;
            case 'Blocked Users':
                navigation.navigate('BlockedUsers');
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
                    <Text style={styles.settingsIcon}>⚙️</Text>
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

                    {profile?.occupation && (
                        <Text style={styles.occupation}>
                            💼 {profile.occupation}
                        </Text>
                    )}

                    {profile?.education && (
                        <Text style={styles.education}>
                            🎓 {profile.education}
                        </Text>
                    )}

                    {/* Verification & Premium badges */}
                    <View style={styles.badges}>
                        {profile?.isVerified && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeIcon}>✓</Text>
                                <Text style={styles.badgeText}>Verified</Text>
                            </View>
                        )}
                        {subscription?.isPremium && (
                            <View style={[styles.badge, styles.premiumBadge]}>
                                <Text style={styles.badgeIcon}>⭐</Text>
                                <Text style={styles.badgeText}>Premium</Text>
                            </View>
                        )}
                    </View>

                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        style={styles.editProfileButton}
                        onPress={() => handleMenuPress('Edit Profile')}
                    >
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Completion */}
                {profileCompletion < 100 && (
                    <View style={styles.completionCard}>
                        <View style={styles.completionHeader}>
                            <Text style={styles.completionTitle}>Complete Your Profile</Text>
                            <Text style={styles.completionPercent}>{profileCompletion}%</Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View
                                style={[styles.progressFill, { width: `${profileCompletion}%` }]}
                            />
                        </View>
                        <Text style={styles.completionHint}>
                            Complete profiles get more matches!
                        </Text>
                    </View>
                )}

                {/* Stats */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.likes}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.matches}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.views}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuCard}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Edit Profile')}
                    >
                        <Text style={styles.menuIcon}>✏️</Text>
                        <Text style={styles.menuText}>Edit Profile</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Preferences')}
                    >
                        <Text style={styles.menuIcon}>🎯</Text>
                        <Text style={styles.menuText}>Match Preferences</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Photos')}
                    >
                        <Text style={styles.menuIcon}>📸</Text>
                        <Text style={styles.menuText}>Manage Photos</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Subscription')}
                    >
                        <Text style={styles.menuIcon}>💎</Text>
                        <Text style={styles.menuText}>Subscription</Text>
                        <View style={styles.menuBadge}>
                            <Text style={styles.menuBadgeText}>
                                {subscription?.plan || 'Free'}
                            </Text>
                        </View>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Engagement Menu */}
                <View style={styles.menuCard}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Quick Picks')}
                    >
                        <Text style={styles.menuIcon}>⚡</Text>
                        <Text style={styles.menuText}>Quick Picks</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Shortlists')}
                    >
                        <Text style={styles.menuIcon}>💝</Text>
                        <Text style={styles.menuText}>My Shortlist</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Icebreakers')}
                    >
                        <Text style={styles.menuIcon}>🚀</Text>
                        <Text style={styles.menuText}>Icebreaker Questions</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Interests')}
                    >
                        <Text style={styles.menuIcon}>💌</Text>
                        <Text style={styles.menuText}>Interests</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Profile Viewers')}
                    >
                        <Text style={styles.menuIcon}>👀</Text>
                        <Text style={styles.menuText}>Who Viewed Me</Text>
                        {subscription?.isPremium && (
                            <View style={styles.menuBadge}>
                                <Text style={styles.menuBadgeText}>Premium</Text>
                            </View>
                        )}
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.menuCard}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Help & Support')}
                    >
                        <Text style={styles.menuIcon}>❓</Text>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Privacy Policy')}
                    >
                        <Text style={styles.menuIcon}>🔒</Text>
                        <Text style={styles.menuText}>Privacy Policy</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress('Terms of Service')}
                    >
                        <Text style={styles.menuIcon}>📄</Text>
                        <Text style={styles.menuText}>Terms of Service</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* App Version */}
                <Text style={styles.version}>Aroosi v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

// Responsive avatar size
const AVATAR_SIZE = isSmallDevice ? 100 : 120;
const EDIT_BADGE_SIZE = isSmallDevice ? 32 : 36;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        backgroundColor: colors.background.light,
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
        padding: moderateScale(8),
    },
    settingsIcon: {
        fontSize: moderateScale(24),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    profileCard: {
        backgroundColor: colors.background.light,
        alignItems: 'center',
        paddingVertical: moderateScale(24),
        paddingHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(12),
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: moderateScale(48),
        color: colors.primary.DEFAULT,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: EDIT_BADGE_SIZE,
        height: EDIT_BADGE_SIZE,
        borderRadius: EDIT_BADGE_SIZE / 2,
        backgroundColor: colors.primary.DEFAULT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background.light,
    },
    editAvatarIcon: {
        fontSize: moderateScale(16),
    },
    name: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
        textAlign: 'center',
    },
    location: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        marginBottom: moderateScale(4),
    },
    occupation: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        marginBottom: moderateScale(2),
    },
    education: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        marginBottom: moderateScale(12),
    },
    badges: {
        flexDirection: 'row',
        gap: moderateScale(8),
        marginBottom: moderateScale(16),
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.info + '20',
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
        gap: moderateScale(4),
    },
    premiumBadge: {
        backgroundColor: colors.warning + '20',
    },
    badgeIcon: {
        fontSize: moderateScale(12),
    },
    badgeText: {
        fontSize: responsiveFontSizes.xs,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    editProfileButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: isSmallDevice ? moderateScale(24) : moderateScale(32),
        paddingVertical: moderateScale(12),
        borderRadius: borderRadius.xl,
    },
    editProfileText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
    completionCard: {
        backgroundColor: colors.background.light,
        marginHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(12),
        padding: responsiveValues.cardPadding,
        borderRadius: borderRadius.xl,
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    completionTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
    },
    completionPercent: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    progressBar: {
        height: moderateScale(8),
        backgroundColor: colors.neutral[200],
        borderRadius: moderateScale(4),
        marginBottom: moderateScale(8),
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
        borderRadius: moderateScale(4),
    },
    completionHint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.background.light,
        marginHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(12),
        padding: responsiveValues.cardPadding,
        borderRadius: borderRadius.xl,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    statLabel: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border.light,
    },
    menuCard: {
        backgroundColor: colors.background.light,
        marginHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(12),
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveValues.cardPadding,
        paddingVertical: moderateScale(14),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    menuIcon: {
        fontSize: moderateScale(20),
        marginRight: moderateScale(12),
    },
    menuText: {
        flex: 1,
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[800],
    },
    menuBadge: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.md,
        marginRight: moderateScale(8),
    },
    menuBadgeText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.medium,
        textTransform: 'capitalize',
    },
    menuArrow: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[400],
    },
    signOutButton: {
        marginHorizontal: responsiveValues.screenPadding,
        marginTop: moderateScale(12),
        backgroundColor: colors.primary[50],
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    signOutText: {
        color: colors.primary.DEFAULT,
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    version: {
        textAlign: 'center',
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        marginTop: moderateScale(16),
    },
});
