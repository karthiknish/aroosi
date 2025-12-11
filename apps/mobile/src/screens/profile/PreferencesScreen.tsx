/**
 * Preferences Screen - Match preferences settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
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
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
    getProfile,
    updatePreferences,
    type UserPreferences,
} from '../../services/api/profile';

interface PreferencesScreenProps {
    onBack?: () => void;
    onSave?: () => void;
}

export default function PreferencesScreen({ onBack, onSave }: PreferencesScreenProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Preferences state
    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(50);
    const [genderPreference, setGenderPreference] = useState<'male' | 'female' | 'both'>('both');
    const [maxDistance, setMaxDistance] = useState(50);
    const [showOnlyVerified, setShowOnlyVerified] = useState(false);

    // Age options
    const ageOptions = Array.from({ length: 63 }, (_, i) => i + 18); // 18-80

    // Distance options
    const distanceOptions = [10, 25, 50, 100, 200, 500];

    // Load preferences
    const loadPreferences = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getProfile();

            if (response.data?.preferences) {
                const prefs = response.data.preferences;
                if (prefs.ageRange) {
                    setAgeMin(prefs.ageRange.min);
                    setAgeMax(prefs.ageRange.max);
                }
                if (prefs.genderPreference) {
                    setGenderPreference(prefs.genderPreference as 'male' | 'female' | 'both');
                }
                if (prefs.maxDistance) {
                    setMaxDistance(prefs.maxDistance);
                }
                if (prefs.showOnlyVerified !== undefined) {
                    setShowOnlyVerified(prefs.showOnlyVerified);
                }
            }
        } catch (err) {
            console.error('Failed to load preferences:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    // Save preferences
    const handleSave = useCallback(async () => {
        try {
            setSaving(true);

            const preferences: UserPreferences = {
                ageRange: { min: ageMin, max: ageMax },
                genderPreference,
                maxDistance,
                showOnlyVerified,
            };

            const response = await updatePreferences(preferences);

            if (response.error) {
                Alert.alert('Error', response.error);
                return;
            }

            Alert.alert('Success', 'Preferences saved successfully');
            onSave?.();
        } catch (err) {
            Alert.alert('Error', 'Failed to save preferences');
        } finally {
            setSaving(false);
        }
    }, [ageMin, ageMax, genderPreference, maxDistance, showOnlyVerified, onSave]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Match Preferences</Text>
                    <View style={styles.headerRight} />
                </View>
                <LoadingSpinner message="Loading preferences..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Match Preferences</Text>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveText}>
                        {saving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Gender Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Show Me</Text>
                    <View style={styles.optionsRow}>
                        {(['male', 'female', 'both'] as const).map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.optionButton,
                                    genderPreference === option && styles.optionButtonActive
                                ]}
                                onPress={() => setGenderPreference(option)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    genderPreference === option && styles.optionTextActive
                                ]}>
                                    {option === 'male' ? 'Men' : option === 'female' ? 'Women' : 'Everyone'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Age Range */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Age Range</Text>
                        <Text style={styles.sectionValue}>{ageMin} - {ageMax}</Text>
                    </View>

                    <View style={styles.rangeRow}>
                        <View style={styles.rangePicker}>
                            <Text style={styles.rangeLabel}>Min</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.ageScroll}
                            >
                                {ageOptions.filter(a => a <= ageMax).map((age) => (
                                    <TouchableOpacity
                                        key={age}
                                        style={[
                                            styles.ageOption,
                                            ageMin === age && styles.ageOptionActive
                                        ]}
                                        onPress={() => setAgeMin(age)}
                                    >
                                        <Text style={[
                                            styles.ageOptionText,
                                            ageMin === age && styles.ageOptionTextActive
                                        ]}>
                                            {age}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.rangePicker}>
                            <Text style={styles.rangeLabel}>Max</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.ageScroll}
                            >
                                {ageOptions.filter(a => a >= ageMin).map((age) => (
                                    <TouchableOpacity
                                        key={age}
                                        style={[
                                            styles.ageOption,
                                            ageMax === age && styles.ageOptionActive
                                        ]}
                                        onPress={() => setAgeMax(age)}
                                    >
                                        <Text style={[
                                            styles.ageOptionText,
                                            ageMax === age && styles.ageOptionTextActive
                                        ]}>
                                            {age}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </View>

                {/* Distance */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Maximum Distance</Text>
                        <Text style={styles.sectionValue}>{maxDistance} km</Text>
                    </View>

                    <View style={styles.distanceOptions}>
                        {distanceOptions.map((distance) => (
                            <TouchableOpacity
                                key={distance}
                                style={[
                                    styles.distanceOption,
                                    maxDistance === distance && styles.distanceOptionActive
                                ]}
                                onPress={() => setMaxDistance(distance)}
                            >
                                <Text style={[
                                    styles.distanceText,
                                    maxDistance === distance && styles.distanceTextActive
                                ]}>
                                    {distance} km
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Verified Only */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.toggleRow}
                        onPress={() => setShowOnlyVerified(!showOnlyVerified)}
                    >
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleTitle}>Verified Profiles Only</Text>
                            <Text style={styles.toggleDescription}>
                                Only show profiles that have been verified
                            </Text>
                        </View>
                        <View style={[
                            styles.toggle,
                            showOnlyVerified && styles.toggleActive
                        ]}>
                            <View style={[
                                styles.toggleKnob,
                                showOnlyVerified && styles.toggleKnobActive
                            ]} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <Text style={styles.infoText}>
                    These preferences affect who appears in your Discover and Home screens.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

// Responsive toggle sizes
const TOGGLE_WIDTH = moderateScale(50);
const TOGGLE_HEIGHT = moderateScale(30);
const TOGGLE_KNOB_SIZE = moderateScale(26);

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
        width: moderateScale(60),
    },
    saveButton: {
        padding: moderateScale(8),
    },
    saveText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(16),
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    sectionValue: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.primary.DEFAULT,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: moderateScale(8),
    },
    optionButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    optionText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
    },
    optionTextActive: {
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    rangeRow: {
        gap: moderateScale(16),
    },
    rangePicker: {
        marginBottom: moderateScale(12),
    },
    rangeLabel: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[500],
        marginBottom: moderateScale(8),
    },
    ageScroll: {
        flexGrow: 0,
    },
    ageOption: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(8),
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.full,
        marginRight: moderateScale(8),
    },
    ageOptionActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    ageOptionText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
    },
    ageOptionTextActive: {
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    distanceOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    distanceOption: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(8),
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.full,
    },
    distanceOptionActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    distanceText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
    },
    distanceTextActive: {
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleInfo: {
        flex: 1,
        marginRight: moderateScale(16),
    },
    toggleTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.neutral[800],
        marginBottom: moderateScale(4),
    },
    toggleDescription: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    toggle: {
        width: TOGGLE_WIDTH,
        height: TOGGLE_HEIGHT,
        backgroundColor: colors.neutral[200],
        borderRadius: TOGGLE_HEIGHT / 2,
        padding: 2,
    },
    toggleActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    toggleKnob: {
        width: TOGGLE_KNOB_SIZE,
        height: TOGGLE_KNOB_SIZE,
        backgroundColor: '#FFFFFF',
        borderRadius: TOGGLE_KNOB_SIZE / 2,
    },
    toggleKnobActive: {
        transform: [{ translateX: TOGGLE_WIDTH - TOGGLE_KNOB_SIZE - 4 }],
    },
    infoText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        textAlign: 'center',
        paddingHorizontal: responsiveValues.screenPadding,
        marginTop: moderateScale(8),
    },
});
