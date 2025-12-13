/**
 * Report User Modal - Safety feature for reporting inappropriate users
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { 
    colors, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveFontSizes,
} from '../theme';
import {
    reportUser,
    blockUser,
    type ReportReason,
    REPORT_REASON_LABELS,
} from '../services/api/report';

interface ReportUserModalProps {
    visible: boolean;
    userId: string;
    userName: string;
    onClose: () => void;
    onReported?: () => void;
}

export function ReportUserModal({
    visible,
    userId,
    userName,
    onClose,
    onReported,
}: ReportUserModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState('');
    const [alsoBlock, setAlsoBlock] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reasons: ReportReason[] = [
        'harassment',
        'inappropriate_content',
        'fake_profile',
        'spam',
        'underage',
        'threatening_behavior',
        'other',
    ];

    const handleSubmit = useCallback(async () => {
        if (!selectedReason) {
            Alert.alert('Error', 'Please select a reason for reporting');
            return;
        }

        setIsSubmitting(true);
        try {
            // Submit report
            const reportResult = await reportUser({
                reportedUserId: userId,
                reason: selectedReason,
                description: description.trim() || undefined,
            });

            if (reportResult.error) {
                Alert.alert('Error', reportResult.error);
                return;
            }

            // Block user if selected
            if (alsoBlock) {
                await blockUser(userId);
            }

            Alert.alert(
                'Report Submitted',
                `Thank you for helping keep Aroosi safe. We'll review your report and take appropriate action.${alsoBlock ? '\n\nThis user has been blocked.' : ''}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            onReported?.();
                            onClose();
                            // Reset state
                            setSelectedReason(null);
                            setDescription('');
                            setAlsoBlock(true);
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedReason, description, alsoBlock, userId, onClose, onReported]);

    const handleClose = () => {
        if (!isSubmitting) {
            setSelectedReason(null);
            setDescription('');
            setAlsoBlock(true);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={handleClose} 
                        style={styles.closeButton}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.closeText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report {userName}</Text>
                    <View style={styles.headerRight} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Intro */}
                    <Text style={styles.intro}>
                        Help us keep Aroosi safe. Reports are anonymous and reviewed by our team.
                    </Text>

                    {/* Reason Selection */}
                    <Text style={styles.sectionTitle}>Why are you reporting this user?</Text>
                    <View style={styles.reasonsList}>
                        {reasons.map((reason) => (
                            <TouchableOpacity
                                key={reason}
                                style={[
                                    styles.reasonOption,
                                    selectedReason === reason && styles.reasonOptionSelected,
                                ]}
                                onPress={() => setSelectedReason(reason)}
                                disabled={isSubmitting}
                            >
                                <View style={[
                                    styles.radioButton,
                                    selectedReason === reason && styles.radioButtonSelected,
                                ]}>
                                    {selectedReason === reason && (
                                        <View style={styles.radioButtonInner} />
                                    )}
                                </View>
                                <Text style={[
                                    styles.reasonText,
                                    selectedReason === reason && styles.reasonTextSelected,
                                ]}>
                                    {REPORT_REASON_LABELS[reason]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Additional details (optional)</Text>
                    <TextInput
                        style={styles.descriptionInput}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Provide any additional context..."
                        placeholderTextColor={colors.neutral[400]}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        editable={!isSubmitting}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{description.length}/500</Text>

                    {/* Block option */}
                    <TouchableOpacity
                        style={styles.blockOption}
                        onPress={() => setAlsoBlock(!alsoBlock)}
                        disabled={isSubmitting}
                    >
                        <View style={[styles.checkbox, alsoBlock && styles.checkboxSelected]}>
                            {alsoBlock && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.blockText}>
                            Also block this user (they won't be able to see you or message you)
                        </Text>
                    </TouchableOpacity>

                    {/* Submit button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>

                    {/* Info */}
                    <Text style={styles.infoText}>
                        False reports may result in action against your account.
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[200],
    },
    closeButton: {
        padding: moderateScale(4),
    },
    closeText: {
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerRight: {
        width: moderateScale(60),
    },
    content: {
        flex: 1,
        padding: moderateScale(16),
    },
    intro: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
        lineHeight: responsiveFontSizes.base * 1.5,
        marginBottom: moderateScale(24),
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        marginBottom: moderateScale(12),
    },
    reasonsList: {
        marginBottom: moderateScale(24),
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(12),
        paddingHorizontal: moderateScale(12),
        borderRadius: borderRadius.lg,
        marginBottom: moderateScale(8),
        backgroundColor: colors.neutral[50],
    },
    reasonOptionSelected: {
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary.DEFAULT,
    },
    radioButton: {
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        borderWidth: 2,
        borderColor: colors.neutral[300],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(12),
    },
    radioButtonSelected: {
        borderColor: colors.primary.DEFAULT,
    },
    radioButtonInner: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        backgroundColor: colors.primary.DEFAULT,
    },
    reasonText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[700],
        flex: 1,
    },
    reasonTextSelected: {
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.medium,
    },
    descriptionInput: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        minHeight: moderateScale(100),
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    charCount: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(4),
        marginBottom: moderateScale(24),
    },
    blockOption: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: moderateScale(24),
    },
    checkbox: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(12),
    },
    checkboxSelected: {
        backgroundColor: colors.primary.DEFAULT,
        borderColor: colors.primary.DEFAULT,
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.bold,
    },
    blockText: {
        flex: 1,
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[700],
        lineHeight: responsiveFontSizes.sm * 1.5,
    },
    submitButton: {
        backgroundColor: colors.error,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: moderateScale(56),
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    infoText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'center',
        marginTop: moderateScale(16),
        marginBottom: moderateScale(32),
    },
});
