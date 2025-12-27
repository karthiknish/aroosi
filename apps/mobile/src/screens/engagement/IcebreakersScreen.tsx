/**
 * Icebreakers Screen - Answer icebreaker questions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
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
} from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getIcebreakers,
    answerIcebreaker,
    getMyIcebreakerAnswers,
    deleteIcebreakerAnswer,
    type Icebreaker,
    type IcebreakerAnswer,
} from '../../services/api/icebreakers';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'Icebreakers'>;

interface IcebreakerWithAnswer extends Icebreaker {
    answer?: string;
    answeredAt?: string | Date;
}

export default function IcebreakersScreen() {
    const navigation = useNavigation<Navigation>();
    const [icebreakers, setIcebreakers] = useState<IcebreakerWithAnswer[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingAnswer, setEditingAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load icebreakers and answers
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [questionsRes, answersRes] = await Promise.all([
                getIcebreakers(),
                getMyIcebreakerAnswers(),
            ]);

            if (questionsRes.error) {
                setError(questionsRes.error);
                return;
            }

            const questions = questionsRes.data || [];
            const answers = answersRes.data || [];

            // Merge questions with answers
            const merged: IcebreakerWithAnswer[] = questions.map((q) => {
                const answer = answers.find((a) => a.questionId === q.id);
                return {
                    ...q,
                    answer: answer?.answer,
                    answeredAt: answer?.answeredAt,
                };
            });

            // Sort: answered first, then unanswered
            merged.sort((a, b) => {
                if (a.answer && !b.answer) return -1;
                if (!a.answer && b.answer) return 1;
                return 0;
            });

            setIcebreakers(merged);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load icebreakers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle expand/collapse
    const handleExpand = useCallback((id: string, currentAnswer?: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setEditingAnswer('');
        } else {
            setExpandedId(id);
            setEditingAnswer(currentAnswer || '');
        }
    }, [expandedId]);

    // Handle save answer
    const handleSaveAnswer = useCallback(async (questionId: string) => {
        if (!editingAnswer.trim()) {
            Alert.alert('Error', 'Please enter an answer');
            return;
        }

        try {
            setSaving(true);
            const response = await answerIcebreaker(questionId, editingAnswer.trim());

            if (response.data?.success) {
                setIcebreakers((prev) =>
                    prev.map((q) =>
                        q.id === questionId
                            ? { ...q, answer: editingAnswer.trim(), answeredAt: new Date().toISOString() }
                            : q
                    )
                );
                setExpandedId(null);
                setEditingAnswer('');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to save answer');
        } finally {
            setSaving(false);
        }
    }, [editingAnswer]);

    // Handle delete answer
    const handleDeleteAnswer = useCallback(async (questionId: string) => {
        Alert.alert(
            'Delete Answer',
            'Are you sure you want to delete this answer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteIcebreakerAnswer(questionId);
                            setIcebreakers((prev) =>
                                prev.map((q) =>
                                    q.id === questionId
                                        ? { ...q, answer: undefined, answeredAt: undefined }
                                        : q
                                )
                            );
                            setExpandedId(null);
                            setEditingAnswer('');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete answer');
                        }
                    },
                },
            ]
        );
    }, []);

    // Get progress
    const answeredCount = icebreakers.filter((q) => q.answer).length;
    const totalCount = icebreakers.length;
    const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

    // Render icebreaker item
    const renderItem = useCallback(
        ({ item }: { item: IcebreakerWithAnswer }) => {
            const isExpanded = expandedId === item.id;
            const hasAnswer = !!item.answer;

            return (
                <View style={styles.itemContainer}>
                    <TouchableOpacity
                        style={styles.itemHeader}
                        onPress={() => handleExpand(item.id, item.answer)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.questionContainer}>
                            <View style={[styles.statusDot, hasAnswer && styles.statusDotAnswered]} />
                            <Text style={styles.questionText}>{item.text || item.question}</Text>
                        </View>
                        <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                    </TouchableOpacity>

                    {hasAnswer && !isExpanded && (
                        <View style={styles.answerPreview}>
                            <Text style={styles.answerPreviewText} numberOfLines={2}>
                                "{item.answer}"
                            </Text>
                        </View>
                    )}

                    {isExpanded && (
                        <View style={styles.expandedSection}>
                            <TextInput
                                style={styles.answerInput}
                                value={editingAnswer}
                                onChangeText={setEditingAnswer}
                                placeholder="Type your answer..."
                                placeholderTextColor={colors.neutral[400]}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={styles.charCount}>
                                {editingAnswer.length}/500
                            </Text>

                            <View style={styles.actions}>
                                {hasAnswer && (
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteAnswer(item.id)}
                                    >
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={{ flex: 1 }} />
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setExpandedId(null);
                                        setEditingAnswer('');
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                    onPress={() => handleSaveAnswer(item.id)}
                                    disabled={saving}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            );
        },
        [expandedId, editingAnswer, saving, handleExpand, handleSaveAnswer, handleDeleteAnswer]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Icebreakers</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading icebreakers..." />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Icebreakers</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadData()}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Icebreakers</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoIcon}>🚀</Text>
                <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Boost your profile!</Text>
                    <Text style={styles.infoText}>
                        Answering icebreakers helps you appear in more searches and attracts meaningful connections.
                    </Text>
                </View>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Your progress</Text>
                    <Text style={styles.progressCount}>
                        {answeredCount} / {totalCount} answered
                    </Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[styles.progressFill, { width: `${progressPercent}%` }]}
                    />
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <FlatList
                    data={icebreakers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            emoji="❓"
                            title="No icebreakers available"
                            message="Check back later for new questions!"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
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
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
    },
    title: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: colors.primary[50],
        padding: responsiveValues.cardPadding,
        margin: responsiveValues.screenPadding,
        marginBottom: 0,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    infoIcon: {
        fontSize: moderateScale(24),
        marginRight: moderateScale(12),
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
        marginBottom: moderateScale(4),
    },
    infoText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        lineHeight: moderateScale(20),
    },
    progressSection: {
        padding: responsiveValues.screenPadding,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: moderateScale(8),
    },
    progressLabel: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    progressCount: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    progressBar: {
        height: moderateScale(8),
        backgroundColor: colors.neutral[200],
        borderRadius: moderateScale(4),
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
        borderRadius: moderateScale(4),
    },
    listContent: {
        padding: responsiveValues.screenPadding,
        paddingTop: 0,
        paddingBottom: moderateScale(32),
    },
    itemContainer: {
        backgroundColor: colors.background.light,
        borderRadius: borderRadius.xl,
        marginBottom: responsiveValues.itemSpacing,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: responsiveValues.cardPadding,
    },
    questionContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    statusDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        backgroundColor: colors.neutral[300],
        marginRight: moderateScale(12),
        marginTop: moderateScale(6),
    },
    statusDotAnswered: {
        backgroundColor: colors.success,
    },
    questionText: {
        flex: 1,
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[800],
        lineHeight: moderateScale(22),
    },
    expandIcon: {
        fontSize: responsiveFontSizes.xl,
        color: colors.neutral[400],
        marginLeft: moderateScale(8),
    },
    answerPreview: {
        paddingHorizontal: responsiveValues.cardPadding,
        paddingBottom: responsiveValues.cardPadding,
        paddingLeft: responsiveValues.cardPadding + moderateScale(10) + moderateScale(12),
    },
    answerPreviewText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        fontStyle: 'italic',
    },
    expandedSection: {
        padding: responsiveValues.cardPadding,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    answerInput: {
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.lg,
        padding: moderateScale(12),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        minHeight: moderateScale(100),
        borderWidth: 1,
        borderColor: colors.border.light,
        marginTop: moderateScale(12),
    },
    charCount: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(4),
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: moderateScale(12),
        gap: moderateScale(8),
    },
    deleteButton: {
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(12),
    },
    deleteButtonText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.error,
    },
    cancelButton: {
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(12),
    },
    cancelButtonText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
    },
    saveButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(16),
        borderRadius: borderRadius.lg,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: responsiveFontSizes.base,
        color: '#FFFFFF',
        fontWeight: fontWeight.medium,
    },
});
