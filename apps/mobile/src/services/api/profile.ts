/**
 * Profile API Service
 */

import { api, ApiResponse } from './client';
import type { 
    UserProfile, 
    UserPreferences, 
    ProfileUpdateData, 
    UploadPhotoResponse 
} from '@aroosi/shared';

// Re-export types for convenience
export type { 
    UserProfile, 
    UserPreferences, 
    ProfileUpdateData, 
    UploadPhotoResponse,
    UserLocation 
} from '@aroosi/shared';

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<ApiResponse<UserProfile>> {
    return api.get<UserProfile>('/profile');
}

/**
 * Update profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ApiResponse<UserProfile>> {
    return api.patch<UserProfile>('/profile', data as Record<string, unknown>);
}

/**
 * Get another user's profile
 */
export async function getProfileById(userId: string): Promise<ApiResponse<UserProfile>> {
    return api.get<UserProfile>(`/profile-detail/${userId}`);
}

/**
 * Get public profile (limited data)
 */
export async function getPublicProfile(userId: string): Promise<ApiResponse<Partial<UserProfile>>> {
    return api.get<Partial<UserProfile>>(`/public-profile/${userId}`);
}

/**
 * Update preferences
 */
export async function updatePreferences(preferences: UserPreferences): Promise<ApiResponse<UserProfile>> {
    return api.patch<UserProfile>('/profile', { preferences });
}

export async function uploadProfilePhoto(imageUri: string, index: number): Promise<ApiResponse<UploadPhotoResponse>> {
    // Create form data for image upload
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `photo_${index}.jpg`,
    } as any);
    formData.append('index', String(index));

    return api.post<UploadPhotoResponse>('/profile-images/upload', formData);
}

/**
 * Delete profile photo
 */
export async function deleteProfilePhoto(photoUrl: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete(`/profile-images/delete?url=${encodeURIComponent(photoUrl)}`);
}

/**
 * Reorder profile photos
 */
export async function reorderPhotos(photoUrls: string[]): Promise<ApiResponse<{ success: boolean }>> {
    return api.post('/profile-images/reorder', { photos: photoUrls });
}

/**
 * Boost profile
 */
export async function boostProfile(): Promise<ApiResponse<{ success: boolean; expiresAt?: string }>> {
    return api.post('/profile/boost');
}

/**
 * Toggle spotlight
 */
export async function toggleSpotlight(enabled: boolean): Promise<ApiResponse<{ success: boolean }>> {
    return api.post('/profile/spotlight', { enabled });
}
