/**
 * Settings Screen - App settings and account management
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    Linking,
} from 'react-native';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { useAuthStore } from '../../store';

interface SettingsScreenProps {
    onBack?: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
    const { signOut } = useAuthStore();

    // Notification settings
    const [pushNotifications, setPushNotifications] = useState(true);
    const [matchNotifications, setMatchNotifications] = useState(true);
    const [messageNotifications, setMessageNotifications] = useState(true);
    const [likeNotifications, setLikeNotifications] = useState(true);

    // Privacy settings
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [showReadReceipts, setShowReadReceipts] = useState(true);
    const [showDistance, setShowDistance] = useState(true);

    // Handle delete account
    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation for destructive action
                        Alert.alert(
                            'Final Confirmation',
                            'This is your last chance to cancel. Your account, matches, messages, and all data will be permanently deleted.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete Forever',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            const { deleteAccount } = await import('../../services/api/auth');
                                            const result = await deleteAccount();
                                            
                                            if (result.error) {
                                                Alert.alert('Error', result.error);
                                            } else {
                                                // Auth state listener will handle navigation
                                                Alert.alert(
                                                    'Account Deleted',
                                                    'Your account has been successfully deleted.'
                                                );
                                            }
                                        } catch (error) {
                                            Alert.alert(
                                                'Error',
                                                'Failed to delete account. Please try again or contact support@aroosi.app'
                                            );
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    }, []);

    // Handle sign out
    const handleSignOut = useCallback(() => {
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
    }, [signOut]);

    // Open external link
    const openLink = useCallback((url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open the link');
        });
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Push Notifications</Text>
                            <Text style={styles.settingDescription}>
                                Enable all push notifications
                            </Text>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={pushNotifications ? colors.primary.DEFAULT : colors.neutral[400]}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>New Matches</Text>
                            <Text style={styles.settingDescription}>
                                When someone matches with you
                            </Text>
                        </View>
                        <Switch
                            value={matchNotifications}
                            onValueChange={setMatchNotifications}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={matchNotifications ? colors.primary.DEFAULT : colors.neutral[400]}
                            disabled={!pushNotifications}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Messages</Text>
                            <Text style={styles.settingDescription}>
                                When you receive a new message
                            </Text>
                        </View>
                        <Switch
                            value={messageNotifications}
                            onValueChange={setMessageNotifications}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={messageNotifications ? colors.primary.DEFAULT : colors.neutral[400]}
                            disabled={!pushNotifications}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Likes</Text>
                            <Text style={styles.settingDescription}>
                                When someone likes your profile
                            </Text>
                        </View>
                        <Switch
                            value={likeNotifications}
                            onValueChange={setLikeNotifications}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={likeNotifications ? colors.primary.DEFAULT : colors.neutral[400]}
                            disabled={!pushNotifications}
                        />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Show Online Status</Text>
                            <Text style={styles.settingDescription}>
                                Let others see when you're online
                            </Text>
                        </View>
                        <Switch
                            value={showOnlineStatus}
                            onValueChange={setShowOnlineStatus}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={showOnlineStatus ? colors.primary.DEFAULT : colors.neutral[400]}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Read Receipts</Text>
                            <Text style={styles.settingDescription}>
                                Let others see when you've read messages
                            </Text>
                        </View>
                        <Switch
                            value={showReadReceipts}
                            onValueChange={setShowReadReceipts}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={showReadReceipts ? colors.primary.DEFAULT : colors.neutral[400]}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Show Distance</Text>
                            <Text style={styles.settingDescription}>
                                Show your distance to other users
                            </Text>
                        </View>
                        <Switch
                            value={showDistance}
                            onValueChange={setShowDistance}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[200] }}
                            thumbColor={showDistance ? colors.primary.DEFAULT : colors.neutral[400]}
                        />
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/help')}
                    >
                        <Text style={styles.menuText}>Help Center</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('mailto:support@aroosi.app')}
                    >
                        <Text style={styles.menuText}>Contact Support</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/safety')}
                    >
                        <Text style={styles.menuText}>Safety Tips</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Legal Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Legal</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/privacy')}
                    >
                        <Text style={styles.menuText}>Privacy Policy</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/terms')}
                    >
                        <Text style={styles.menuText}>Terms of Service</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/community-guidelines')}
                    >
                        <Text style={styles.menuText}>Community Guidelines</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleSignOut}
                    >
                        <Text style={[styles.menuText, styles.dangerText]}>Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={[styles.menuText, styles.dangerText]}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>Aroosi</Text>
                    <Text style={styles.appVersion}>Version 1.0.0</Text>
                </View>
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
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        backgroundColor: colors.background.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        padding: moderateScale(8),
    },
    backIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[800],
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerRight: {
        width: moderateScale(40),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    section: {
        backgroundColor: colors.background.light,
        marginBottom: responsiveValues.itemSpacing,
        padding: responsiveValues.cardPadding,
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: moderateScale(16),
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    settingInfo: {
        flex: 1,
        marginRight: moderateScale(16),
    },
    settingTitle: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[800],
        marginBottom: moderateScale(4),
    },
    settingDescription: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: moderateScale(48),
    },
    menuText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[800],
    },
    menuArrow: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[400],
    },
    dangerText: {
        color: colors.error,
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: moderateScale(24),
    },
    appName: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    appVersion: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        marginTop: moderateScale(4),
    },
});
