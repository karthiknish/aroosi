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

interface ProfileDetailResponse {
    profileData?: UserProfile | null;
    isBlocked?: boolean;
    isMutualInterest?: boolean;
}

interface PublicProfileResponse extends Partial<UserProfile> {
    userId?: string;
    city?: string;
    state?: string;
    country?: string;
    profileImageUrls?: string[];
}

function normalizeProfileDetail(
    userId: string,
    response: ApiResponse<ProfileDetailResponse>
): ApiResponse<UserProfile> {
    const profileData = response.data?.profileData;

    if (!profileData) {
        return {
            ...response,
            data: undefined,
        };
    }

    return {
        ...response,
        data: {
            ...profileData,
            id: profileData.id || userId,
            isBlocked: response.data?.isBlocked ?? profileData.isBlocked,
            isMutualInterest: response.data?.isMutualInterest ?? profileData.isMutualInterest,
        },
    };
}

function normalizePublicProfile(
    userId: string,
    response: ApiResponse<PublicProfileResponse>
): ApiResponse<Partial<UserProfile>> {
    const profileData = response.data;

    if (!profileData) {
        return response;
    }

    return {
        ...response,
        data: {
            ...profileData,
            id: profileData.id || profileData.userId || userId,
            location: profileData.location || {
                city: profileData.city,
                state: profileData.state,
                country: profileData.country,
            },
            photos: profileData.photos || profileData.profileImageUrls,
        },
    };
}

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
    const response = await api.get<ProfileDetailResponse>(`/profile-detail/${userId}`);
    return normalizeProfileDetail(userId, response);
}

/**
 * Get public profile (limited data)
 */
export async function getPublicProfile(userId: string): Promise<ApiResponse<Partial<UserProfile>>> {
    const response = await api.get<PublicProfileResponse>(
        `/public-profile?userId=${encodeURIComponent(userId)}`
    );
    return normalizePublicProfile(userId, response);
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
export async function deletePhoto(photoUrl: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete(`/profile-images?url=${encodeURIComponent(photoUrl)}`);
}

// Backwards-compatible alias (used by EditProfileScreen)
export async function deleteProfilePhoto(photoUrl: string): Promise<ApiResponse<{ success: boolean }>> {
    return deletePhoto(photoUrl);
}

export async function reorderPhotos(photoUrls: string[]): Promise<ApiResponse<{ success: boolean }>> {
    return api.post('/profile-images/order', { photos: photoUrls });
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
