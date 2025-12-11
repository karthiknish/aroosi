/**
 * Shortlists Screen - Manage shortlisted profiles with notes
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
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    fetchShortlists,
    toggleShortlist,
    fetchNote,
    setNote,
    type ShortlistEntry,
} from '../../services/api/engagement';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'Shortlists'>;

export default function ShortlistsScreen() {
    const navigation = useNavigation<Navigation>();
    const [shortlists, setShortlists] = useState<ShortlistEntry[]>([]);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingNote, setEditingNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load shortlists
    const loadShortlists = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await fetchShortlists();

            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.data) {
                setShortlists(response.data);

                // Load notes for each shortlist entry
                const notePromises = response.data.map(async (entry) => {
                    try {
                        const noteRes = await fetchNote(entry.userId);
                        if (noteRes.data?.note) {
                            return { userId: entry.userId, note: noteRes.data.note };
                        }
                    } catch {
                        // Ignore note fetch errors
                    }
                    return null;
                });

                const noteResults = await Promise.all(notePromises);
                const notesMap: Record<string, string> = {};
                noteResults.forEach((result) => {
                    if (result) {
                        notesMap[result.userId] = result.note;
                    }
                });
                setNotes(notesMap);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load shortlists');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadShortlists();
    }, [loadShortlists]);

    // Handle remove from shortlist
    const handleRemove = useCallback(async (userId: string) => {
        Alert.alert(
            'Remove from Shortlist',
            'Are you sure you want to remove this profile from your shortlist?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await toggleShortlist(userId);
                            if (response.data?.removed) {
                                setShortlists((prev) =>
                                    prev.filter((entry) => entry.userId !== userId)
                                );
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to remove from shortlist');
                        }
                    },
                },
            ]
        );
    }, []);

    // Handle save note
    const handleSaveNote = useCallback(async (userId: string) => {
        try {
            setSavingNote(true);
            const response = await setNote(userId, editingNote);
            if (response.data?.success) {
                setNotes((prev) => ({ ...prev, [userId]: editingNote }));
                setExpandedId(null);
                setEditingNote('');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to save note');
        } finally {
            setSavingNote(false);
        }
    }, [editingNote]);

    // Handle expand/collapse
    const handleExpand = useCallback((userId: string) => {
        if (expandedId === userId) {
            setExpandedId(null);
            setEditingNote('');
        } else {
            setExpandedId(userId);
            setEditingNote(notes[userId] || '');
        }
    }, [expandedId, notes]);

    // Format date
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Render shortlist item
    const renderItem = useCallback(
        ({ item }: { item: ShortlistEntry }) => {
            const isExpanded = expandedId === item.userId;
            const note = notes[item.userId];

            return (
                <View style={styles.itemContainer}>
                    <TouchableOpacity
                        style={styles.itemContent}
                        onPress={() => handleExpand(item.userId)}
                        activeOpacity={0.7}
                    >
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {item.profileImageUrls && item.profileImageUrls[0] ? (
                                <Image
                                    source={{ uri: item.profileImageUrls[0] }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {item.fullName?.charAt(0) || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.name} numberOfLines={1}>
                                {item.fullName || 'Member'}
                            </Text>
                            <Text style={styles.date}>
                                Added {formatDate(item.createdAt)}
                            </Text>
                            {note && !isExpanded && (
                                <Text style={styles.notePreview} numberOfLines={1}>
                                    📝 {note}
                                </Text>
                            )}
                        </View>

                        {/* Actions */}
                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => handleRemove(item.userId)}
                            >
                                <Text style={styles.removeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    {/* Expanded note section */}
                    {isExpanded && (
                        <View style={styles.noteSection}>
                            <Text style={styles.noteLabel}>Private Note</Text>
                            <TextInput
                                style={styles.noteInput}
                                value={editingNote}
                                onChangeText={setEditingNote}
                                placeholder="Add a private note about this person..."
                                placeholderTextColor={colors.neutral[400]}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                            <View style={styles.noteActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setExpandedId(null);
                                        setEditingNote('');
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        savingNote && styles.saveButtonDisabled,
                                    ]}
                                    onPress={() => handleSaveNote(item.userId)}
                                    disabled={savingNote}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {savingNote ? 'Saving...' : 'Save Note'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            );
        },
        [expandedId, notes, editingNote, savingNote, handleExpand, handleRemove, handleSaveNote]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>My Shortlist</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading your shortlist..." />
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
                    <Text style={styles.title}>My Shortlist</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadShortlists()}
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
                <Text style={styles.title}>My Shortlist</Text>
                <Text style={styles.count}>{shortlists.length}</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <FlatList
                    data={shortlists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadShortlists(true)}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            emoji="💝"
                            title="No shortlists yet"
                            message="When you find someone special, add them to your shortlist to keep track!"
                            actionLabel="Discover People"
                            onAction={() => navigation.goBack()}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Responsive avatar size
const AVATAR_SIZE = responsiveValues.avatarSmall;
const REMOVE_BUTTON_SIZE = isSmallDevice ? 28 : 32;

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
    count: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        minWidth: moderateScale(50),
        textAlign: 'right',
    },
    listContent: {
        padding: responsiveValues.screenPadding,
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
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: responsiveValues.cardPadding,
    },
    avatarContainer: {
        marginRight: moderateScale(12),
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
        fontSize: responsiveFontSizes.xl,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.bold,
    },
    infoContainer: {
        flex: 1,
        marginRight: moderateScale(8),
    },
    name: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    date: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(4),
    },
    notePreview: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        marginTop: moderateScale(4),
        fontStyle: 'italic',
    },
    itemActions: {
        marginLeft: moderateScale(8),
    },
    removeButton: {
        width: REMOVE_BUTTON_SIZE,
        height: REMOVE_BUTTON_SIZE,
        borderRadius: REMOVE_BUTTON_SIZE / 2,
        backgroundColor: colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        fontSize: responsiveFontSizes.base,
        color: colors.error,
    },
    noteSection: {
        padding: responsiveValues.cardPadding,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    noteLabel: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
        marginBottom: moderateScale(8),
        marginTop: moderateScale(12),
    },
    noteInput: {
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.lg,
        padding: moderateScale(12),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        minHeight: moderateScale(80),
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    noteActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: moderateScale(12),
        marginTop: moderateScale(12),
    },
    cancelButton: {
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(16),
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
