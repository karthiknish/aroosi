/**
 * User Types - Shared between web and mobile
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

export interface UserProfile extends User {
    bio?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    location?: {
        city?: string;
        state?: string;
        country?: string;
    };
    preferences?: UserPreferences;
    photos?: string[];
    isVerified?: boolean;
    isPremium?: boolean;
    lastActive?: Date | string;
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
