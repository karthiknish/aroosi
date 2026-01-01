/**
 * Spotlight API Service
 */

import { api, ApiResponse } from './client';

/**
 * Activate spotlight for the current user
 */
export async function activateSpotlight(durationHours = 1): Promise<ApiResponse<{ success: boolean; expiresAt: string }>> {
    return api.post<{ success: boolean; expiresAt: string }>('/profile/spotlight', { durationHours });
}

/**
 * Get current spotlight status
 */
export async function getSpotlightStatus(): Promise<ApiResponse<{ active: boolean; expiresAt?: string }>> {
    return api.get<{ active: boolean; expiresAt?: string }>('/profile/spotlight');
}

/**
 * Get spotlight history
 */
export async function getSpotlightHistory() {
    return api.get('/profile/spotlight/history');
}
