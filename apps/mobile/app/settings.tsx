import { router } from 'expo-router';
import SettingsScreen from '@/src/screens/profile/SettingsScreen';

export default function SettingsRoute() {
    return <SettingsScreen onBack={() => router.back()} />;
}
                style={styles.header}
                entering={FadeInDown.duration(400)}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <SymbolView
                        name="chevron.left"
                        weight="semibold"
                        tintColor={colors.neutral[800]}
                        size={24}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerRight} />
            </AnimatedView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Notifications Section */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(100)}
                >
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
                </AnimatedView>

                {/* Privacy Section */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(150)}
                >
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
                </AnimatedView>

                {/* Support Section */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(200)}
                >
                    <Text style={styles.sectionTitle}>Support</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/help')}
                    >
                        <Text style={styles.menuText}>Help Center</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('mailto:support@aroosi.app')}
                    >
                        <Text style={styles.menuText}>Contact Support</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/safety')}
                    >
                        <Text style={styles.menuText}>Safety Tips</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>
                </AnimatedView>

                {/* Legal Section */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(250)}
                >
                    <Text style={styles.sectionTitle}>Legal</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/privacy')}
                    >
                        <Text style={styles.menuText}>Privacy Policy</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/terms')}
                    >
                        <Text style={styles.menuText}>Terms of Service</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => openLink('https://aroosi.app/community-guidelines')}
                    >
                        <Text style={styles.menuText}>Community Guidelines</Text>
                        <SymbolView
                            name="chevron.right"
                            weight="medium"
                            tintColor={colors.neutral[400]}
                            size={18}
                        />
                    </TouchableOpacity>
                </AnimatedView>

                {/* Account Section */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(300)}
                >
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
                </AnimatedView>

                {/* App Info */}
                <AnimatedView
                    style={styles.appInfo}
                    entering={FadeIn.duration(400).delay(350)}
                >
                    <Text style={styles.appName}>Aroosi</Text>
                    <Text style={styles.appVersion}>Version 1.0.0</Text>
                </AnimatedView>
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
