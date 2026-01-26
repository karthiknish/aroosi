/**
 * Report Form Sheet - Report a user
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    colors,
    borderRadius,
    fontWeight,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '@/theme';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeIn,
    FadeInUp,
} from 'react-native-reanimated';

const AnimatedView = Animated.View;

type ReportReason = {
    id: string;
    label: string;
    description: string;
};

const REPORT_REASONS: ReportReason[] = [
    {
        id: 'inappropriate',
        label: 'Inappropriate Content',
        description: 'Profile contains inappropriate photos or information',
    },
    {
        id: 'fake',
        label: 'Fake Profile',
        description: 'Profile appears to be fake or spam',
    },
    {
        id: 'harassment',
        label: 'Harassment',
        description: 'This person is harassing me or others',
    },
    {
        id: 'scam',
        label: 'Scam',
        description: 'This person is attempting to scam users',
    },
    {
        id: 'underage',
        label: 'Underage User',
        description: 'This person appears to be under 18',
    },
    {
        id: 'other',
        label: 'Other',
        description: 'Something else not covered above',
    },
];

export default function ReportScreen() {
    const { userName, userId } = useLocalSearchParams<{
        userName?: string;
        userId?: string;
    }>();

    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [description, setDescription] = useState('');

    const handleSubmit = useCallback(() => {
        if (!selectedReason) {
            Alert.alert('Select a Reason', 'Please select a reason for reporting this user.');
            return;
        }

        // TODO: Submit report to API
        Alert.alert(
            'Report Submitted',
            'Thank you for helping keep our community safe. We will review your report shortly.',
            [
                { text: 'OK', onPress: () => router.back() },
            ]
        );
    }, [selectedReason, description]);

    return (
        <View style={styles.container}>
            {/* Card Background */}
            <BlurView
                tint="systemMaterial"
                intensity={100}
                style={StyleSheet.absoluteFill}
            />

            <AnimatedView
                style={styles.contentContainer}
                entering={FadeIn.duration(300)}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <SymbolView
                            name="flag.fill"
                            tintColor="#FFFFFF"
                            size={24}
                        />
                    </View>
                    <Text style={styles.title}>Report User</Text>
                    <Text style={styles.subtitle}>
                        Help us keep the community safe
                    </Text>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Report Reasons */}
                    <AnimatedView
                        style={styles.section}
                        entering={FadeInUp.duration(300).delay(50)}
                    >
                        <Text style={styles.sectionTitle}>
                            Why are you reporting {userName || 'this user'}?
                        </Text>

                        {REPORT_REASONS.map((reason) => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonCard,
                                    selectedReason === reason.id && styles.reasonCardSelected,
                                ]}
                                onPress={() => setSelectedReason(reason.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.reasonContent}>
                                    <Text
                                        style={[
                                            styles.reasonLabel,
                                            selectedReason === reason.id && styles.reasonLabelSelected,
                                        ]}
                                    >
                                        {reason.label}
                                    </Text>
                                    <Text style={styles.reasonDescription}>
                                        {reason.description}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.radioButton,
                                        selectedReason === reason.id && styles.radioButtonSelected,
                                    ]}
                                >
                                    {selectedReason === reason.id && (
                                        <View style={styles.radioDot} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </AnimatedView>

                    {/* Additional Details */}
                    <AnimatedView
                        style={styles.section}
                        entering={FadeInUp.duration(300).delay(100)}
                    >
                        <Text style={styles.sectionTitle}>
                            Additional Details (Optional)
                        </Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Provide more context about your report..."
                            placeholderTextColor={colors.neutral[400]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>
                            {description.length}/500
                        </Text>
                    </AnimatedView>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <SymbolView
                            name="info.circle.fill"
                            tintColor={colors.warning}
                            size={16}
                        />
                        <Text style={styles.infoText}>
                            False reports may result in account suspension.
                            Please only report legitimate violations.
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer */}
                <AnimatedView
                    style={styles.footer}
                    entering={FadeInUp.duration(300).delay(150)}
                >
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!selectedReason}
                    >
                        <Text style={styles.submitButtonText}>Submit Report</Text>
                    </TouchableOpacity>
                </AnimatedView>
            </AnimatedView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.background.light,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius['2xl'],
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(16),
        paddingHorizontal: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    iconContainer: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: moderateScale(12),
    },
    title: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    subtitle: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    section: {
        padding: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
        marginBottom: moderateScale(12),
    },
    reasonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: moderateScale(14),
        marginBottom: moderateScale(8),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.neutral[50],
        borderWidth: 2,
        borderColor: 'transparent',
    },
    reasonCardSelected: {
        backgroundColor: `${colors.error}15`,
        borderColor: colors.error,
    },
    reasonContent: {
        flex: 1,
        marginRight: moderateScale(12),
    },
    reasonLabel: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.neutral[800],
        marginBottom: moderateScale(2),
    },
    reasonLabelSelected: {
        color: colors.error,
    },
    reasonDescription: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    radioButton: {
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        borderWidth: 2,
        borderColor: colors.neutral[300],
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: colors.error,
    },
    radioDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        backgroundColor: colors.error,
    },
    textInput: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(14),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        minHeight: moderateScale(100),
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(4),
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${colors.warning}15`,
        borderRadius: borderRadius.lg,
        padding: moderateScale(12),
        marginHorizontal: moderateScale(20),
        marginTop: moderateScale(8),
        gap: moderateScale(8),
    },
    infoText: {
        flex: 1,
        fontSize: responsiveFontSizes.sm,
        color: colors.warning,
        lineHeight: responsiveFontSizes.sm * 1.4,
    },
    footer: {
        flexDirection: 'row',
        gap: moderateScale(12),
        padding: moderateScale(20),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: moderateScale(14),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.neutral[200],
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
    },
    submitButton: {
        flex: 1,
        paddingVertical: moderateScale(14),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.error,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: colors.neutral[300],
    },
    submitButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
