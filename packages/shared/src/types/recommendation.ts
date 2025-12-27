/**
 * Recommendation Types - Shared between web and mobile
 */

export interface RecommendedProfile {
    id?: string;
    userId?: string;
    fullName?: string | null;
    displayName?: string | null;
    profileImageUrls?: string[] | null;
    photoURL?: string | null;
    photos?: string[];
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    age?: number;
    occupation?: string | null;
    education?: string | null;
    matchScore?: number;
    compatibility?: number; // 0-100
    commonInterests?: string[];
    interests?: string[];
    location?: {
        city?: string;
        distance?: number;
    };
    isVerified?: boolean;
    isPremium?: boolean;
}

export interface QuickPick {
    id: string;
    userId?: string;
    profile?: RecommendedProfile;
    user?: RecommendedProfile;
    reason?: string;
    expiresAt?: Date | string;
    viewed?: boolean;
}

export interface SearchFilters {
    ageMin?: number;
    ageMax?: number;
    ageRange?: { min: number; max: number };
    gender?: 'male' | 'female' | 'other';
    city?: string;
    state?: string;
    country?: string;
    religion?: string;
    ethnicity?: string;
    motherTongue?: string;
    maritalStatus?: string;
    education?: string;
    occupation?: string;
    distance?: number;
    verified?: boolean;
    interests?: string[];
}

