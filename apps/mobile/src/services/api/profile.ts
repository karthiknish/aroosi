/**
 * Profile API Service
 */

import { api } from './client';

export interface UserProfile {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    bio?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    location?: {
        city?: string;
        state?: string;
        country?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    preferences?: UserPreferences;
    photos?: string[];
    interests?: string[];
    isVerified?: boolean;
    isPremium?: boolean;
    lastActive?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserPreferences {
    ageRange?: {
        min: number;
        max: number;
    };
    genderPreference?: 'male' | 'female' | 'both' | 'other';
    maxDistance?: number;
    showOnlyVerified?: boolean;
}

export interface ProfileUpdateData {
    displayName?: string;
    bio?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    location?: {
        city?: string;
        state?: string;
        country?: string;
    };
    interests?: string[];
}

/**
 * Get current user's profile
 */
export async function getProfile() {
    return api.get<UserProfile>('/profile');
}

/**
 * Update profile
 */
export async function updateProfile(data: ProfileUpdateData) {
    return api.patch<UserProfile>('/profile', data as Record<string, unknown>);
}

/**
 * Get another user's profile
 */
export async function getProfileById(userId: string) {
    return api.get<UserProfile>(`/profile-detail/${userId}`);
}

/**
 * Get public profile (limited data)
 */
export async function getPublicProfile(userId: string) {
    return api.get<Partial<UserProfile>>(`/public-profile/${userId}`);
}

/**
 * Update preferences
 */
export async function updatePreferences(preferences: UserPreferences) {
    return api.patch<UserProfile>('/profile', { preferences });
}

/**
 * Upload profile photo
 */
export async function uploadProfilePhoto(imageUri: string, index: number) {
    // Create form data for image upload
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `photo_${index}.jpg`,
    } as unknown as Blob);
    formData.append('index', String(index));

    // Use custom fetch for multipart form data
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/profile-images/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json();
}

/**
 * Delete profile photo
 */
export async function deleteProfilePhoto(photoUrl: string) {
    return api.delete(`/profile-images/delete?url=${encodeURIComponent(photoUrl)}`);
}

/**
 * Reorder profile photos
 */
export async function reorderPhotos(photoUrls: string[]) {
    return api.post('/profile-images/reorder', { photos: photoUrls });
}

/**
 * Boost profile
 */
export async function boostProfile() {
    return api.post('/profile/boost');
}

/**
 * Toggle spotlight
 */
export async function toggleSpotlight(enabled: boolean) {
    return api.post('/profile/spotlight', { enabled });
}

// Helper to get auth token
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config';

async function getAuthToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
}
