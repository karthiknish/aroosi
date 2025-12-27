/**
 * useOffline Hook - Detects network status
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useOffline() {
    const [isOffline, setIsOffline] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState<NetInfoState | null>(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
            setConnectionInfo(state);
        });

        // Initial check
        NetInfo.fetch().then(state => {
            setIsOffline(!state.isConnected);
            setConnectionInfo(state);
        });

        return () => unsubscribe();
    }, []);

    return { isOffline, connectionInfo };
}
