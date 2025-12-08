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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
            default:
                Alert.alert('Coming Soon', `${item} will be available soon!`);
        }
    };

    // Get profile completion percentage
    const getProfileCompletion = () => {
        if (!profile) return 0;
        let completed = 0;
        const fields = ['displayName', 'bio', 'age', 'gender', 'location', 'photos', 'interests'];
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
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
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

                {/* Support Menu */}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        backgroundColor: colors.background.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    settingsButton: {
        padding: spacing[2],
    },
    settingsIcon: {
        fontSize: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing[8],
    },
    profileCard: {
        backgroundColor: colors.background.light,
        alignItems: 'center',
        paddingVertical: spacing[6],
        paddingHorizontal: spacing[4],
        marginBottom: spacing[3],
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing[4],
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 48,
        color: colors.primary.DEFAULT,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary.DEFAULT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background.light,
    },
    editAvatarIcon: {
        fontSize: 16,
    },
    name: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: spacing[1],
    },
    location: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
        marginBottom: spacing[3],
    },
    badges: {
        flexDirection: 'row',
        gap: spacing[2],
        marginBottom: spacing[4],
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.info + '20',
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.full,
        gap: spacing[1],
    },
    premiumBadge: {
        backgroundColor: colors.warning + '20',
    },
    badgeIcon: {
        fontSize: 12,
    },
    badgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    editProfileButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[3],
        borderRadius: borderRadius.xl,
    },
    editProfileText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
    completionCard: {
        backgroundColor: colors.background.light,
        marginHorizontal: spacing[4],
        marginBottom: spacing[3],
        padding: spacing[4],
        borderRadius: borderRadius.xl,
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[2],
    },
    completionTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
    },
    completionPercent: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.neutral[200],
        borderRadius: 4,
        marginBottom: spacing[2],
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
        borderRadius: 4,
    },
    completionHint: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.background.light,
        marginHorizontal: spacing[4],
        marginBottom: spacing[3],
        padding: spacing[4],
        borderRadius: borderRadius.xl,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    statLabel: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border.light,
    },
    menuCard: {
        backgroundColor: colors.background.light,
        marginHorizontal: spacing[4],
        marginBottom: spacing[3],
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    menuIcon: {
        fontSize: 20,
        marginRight: spacing[3],
    },
    menuText: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.neutral[800],
    },
    menuBadge: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.md,
        marginRight: spacing[2],
    },
    menuBadgeText: {
        fontSize: fontSize.xs,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.medium,
        textTransform: 'capitalize',
    },
    menuArrow: {
        fontSize: fontSize.base,
        color: colors.neutral[400],
    },
    signOutButton: {
        marginHorizontal: spacing[4],
        marginTop: spacing[3],
        backgroundColor: colors.primary[50],
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    signOutText: {
        color: colors.primary.DEFAULT,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
    version: {
        textAlign: 'center',
        fontSize: fontSize.sm,
        color: colors.neutral[400],
        marginTop: spacing[4],
    },
});
