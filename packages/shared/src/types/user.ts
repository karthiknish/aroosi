/**
 * User & Profile Types - Shared between web and mobile
 */

export interface User {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface UserLocation {
    city?: string;
    state?: string;
    country?: string;
    origin?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface UserPreferences {
    ageRange?: {
        min: number;
        max: number;
    };
    genderPreference?: 'male' | 'female' | 'both' | 'other';
    maxDistance?: number; // in kilometers
    showOnlyVerified?: boolean;
}

export interface UserProfile extends User {
    fullName?: string;
    profileFor?: 'self' | 'friend' | 'family';
    bio?: string;
    aboutMe?: string;
    age?: number;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    preferredGender?: 'male' | 'female' | 'both' | 'other';
    location?: UserLocation;
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
    lastActive?: Date | string;
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
    location?: Omit<UserLocation, 'coordinates'>;
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

export interface UploadPhotoResponse {
    url: string;
    imageId?: string;
}
