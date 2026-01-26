/**
 * Blocked Users Screen
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, moderateScale, responsiveValues, responsiveFontSizes } from '@/theme';

export default function BlockedUsersScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Blocked Users</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.message}>Blocked users functionality coming soon!</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    backButton: {
        width: moderateScale(40),
    },
    backButtonText: {
        fontSize: moderateScale(28),
        color: colors.neutral[800],
    },
    title: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: 'bold',
        color: colors.neutral[900],
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: responsiveValues.screenPadding,
    },
    message: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        textAlign: 'center',
        marginBottom: moderateScale(24),
    },
    button: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: '600',
    },
});
