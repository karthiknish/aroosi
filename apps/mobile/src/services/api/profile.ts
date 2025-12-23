/**
 * Profile API Service
 */

import { api } from './client';

export interface UserProfile {
    id: string;
    email: string | null;
    displayName: string | null;
    fullName?: string;
    profileFor?: 'self' | 'friend' | 'family';
    photoURL: string | null;
    bio?: string;
    aboutMe?: string;
    age?: number;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    preferredGender?: 'male' | 'female' | 'both' | 'other';
    location?: {
        city?: string;
        state?: string;
        country?: string;
        origin?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    education?: string;
    occupation?: string;
    income?: string;
    height?: string;
    maritalStatus?: string;
    religion?: string;
    sect?: string;
    caste?: string;
    motherTongue?: string;
    preferences?: UserPreferences;
    photos?: string[];
    profileImageIds?: string[];
    interests?: string[];
    isVerified?: boolean;
    isPremium?: boolean;
    isBlocked?: boolean;
    isMutualInterest?: boolean;
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
    fullName?: string;
    profileFor?: 'self' | 'friend' | 'family';
    bio?: string;
    aboutMe?: string;
    age?: number;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    preferredGender?: 'male' | 'female' | 'both' | 'other';
    location?: {
        city?: string;
        state?: string;
        country?: string;
        origin?: string;
    };
    education?: string;
    occupation?: string;
    income?: string;
    height?: string;
    maritalStatus?: string;
    religion?: string;
    sect?: string;
    caste?: string;
    motherTongue?: string;
    interests?: string[];
    onboardingComplete?: boolean;
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
export interface UploadPhotoResponse {
    url: string;
    imageId?: string;
}

export async function uploadProfilePhoto(imageUri: string, index: number) {
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
