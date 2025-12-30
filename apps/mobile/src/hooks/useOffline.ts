/**
 * useOffline Hook - Detects network status and provides utilities
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface NetworkStatus {
    isOffline: boolean;
    isConnected: boolean;
    quality: NetworkQuality;
    type: string | null;
    connectionInfo: NetInfoState | null;
}

/**
 * Determine network quality based on connection info
 */
function getNetworkQuality(state: NetInfoState): NetworkQuality {
    if (!state.isConnected) return 'offline';
    
    const details = state.details as Record<string, unknown> | null;
    
    // WiFi or Ethernet
    if (state.type === 'wifi' || state.type === 'ethernet') {
        return 'excellent';
    }
    
    // Cellular - check generation
    if (state.type === 'cellular' && details) {
        const generation = details.cellularGeneration as string | undefined;
        if (generation === '4g' || generation === '5g') return 'good';
        if (generation === '3g') return 'poor';
        return 'poor'; // 2g or unknown
    }
    
    return 'good'; // Default for other types
}

/**
 * Check if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
    if (!error) return false;
    
    const message = error instanceof Error ? error.message : String(error);
    const networkErrorPatterns = [
        'network request failed',
        'network error',
        'no internet',
        'failed to fetch',
        'connection refused',
        'timeout',
        'aborted',
        'econnrefused',
        'enetunreach',
        'enotfound',
    ];
    
    return networkErrorPatterns.some(pattern => 
        message.toLowerCase().includes(pattern)
    );
}

/**
 * Get user-friendly error message for network errors
 */
export function getNetworkErrorMessage(error: unknown, isCurrentlyOffline: boolean): string {
    if (isCurrentlyOffline) {
        return "You're offline. Please check your internet connection and try again.";
    }
    
    if (isNetworkError(error)) {
        return "Connection problem. Please check your internet and try again.";
    }
    
    const message = error instanceof Error ? error.message : String(error);
    
    // Check for specific API error
    if (message.includes('No internet connection')) {
        return "No internet connection. Please connect and try again.";
    }
    
    return message || "Something went wrong. Please try again.";
}

/**
 * Show offline alert with retry option
 */
export function showOfflineAlert(onRetry?: () => void): void {
    Alert.alert(
        "You're Offline",
        "Please check your internet connection and try again.",
        [
            { text: 'Cancel', style: 'cancel' },
            ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : []),
        ]
    );
}

export function useOffline() {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOffline: false,
        isConnected: true,
        quality: 'good',
        type: null,
        connectionInfo: null,
    });

    const updateNetworkStatus = useCallback((state: NetInfoState) => {
        setNetworkStatus({
            isOffline: !state.isConnected,
            isConnected: !!state.isConnected,
            quality: getNetworkQuality(state),
            type: state.type,
            connectionInfo: state,
        });
    }, []);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(updateNetworkStatus);

        // Initial check
        NetInfo.fetch().then(updateNetworkStatus);

        return () => unsubscribe();
    }, [updateNetworkStatus]);

    // Convenience method to check network before action
    const checkNetworkOrAlert = useCallback((onRetry?: () => void): boolean => {
        if (networkStatus.isOffline) {
            showOfflineAlert(onRetry);
            return false;
        }
        return true;
    }, [networkStatus.isOffline]);

    // Get appropriate error message
    const getErrorMessage = useCallback((error: unknown): string => {
        return getNetworkErrorMessage(error, networkStatus.isOffline);
    }, [networkStatus.isOffline]);

    return {
        ...networkStatus,
        checkNetworkOrAlert,
        getErrorMessage,
    };
}
