/**
 * Profile Image Utilities
 * Centralizes logic for handling profile photo URLs, placeholders, and lists.
 */

export interface MinimalProfile {
    photoURL?: string | null;
    photos?: (string | null)[];
    profileImageUrls?: string[] | null;
    gender?: string | null;
}

/**
 * Get the main profile image URL for a user.
 */
export function getMainProfileImage(profile: MinimalProfile | null | undefined): string | null {
    if (!profile) return null;
    
    // Check photos array first (preferred)
    if (profile.photos && profile.photos.length > 0 && profile.photos[0]) {
        return profile.photos[0];
    }
    
    // Check shared type fields
    if (profile.profileImageUrls && profile.profileImageUrls.length > 0 && profile.profileImageUrls[0]) {
        return profile.profileImageUrls[0];
    }
    
    // Fallback to photoURL
    if (profile.photoURL) {
        return profile.photoURL;
    }

    return null;
}

/**
 * Get all profile images as a flat list of strings.
 */
export function getProfilePhotos(profile: MinimalProfile | null | undefined): string[] {
    if (!profile) return [];

    const photosSet = new Set<string>();

    // Add photos from array
    if (profile.photos && Array.isArray(profile.photos)) {
        profile.photos.forEach(p => {
            if (p) photosSet.add(p);
        });
    }

    // Add shared type fields
    if (profile.profileImageUrls && Array.isArray(profile.profileImageUrls)) {
        profile.profileImageUrls.forEach((url: string) => {
            if (url) photosSet.add(url);
        });
    }

    // Add photoURL if not already present
    if (profile.photoURL) {
        photosSet.add(profile.photoURL);
    }

    return Array.from(photosSet);
}

/**
 * Get placeholder emoji based on gender
 */
export function getGenderPlaceholder(gender?: string | null): string {
    const g = gender?.toLowerCase();
    if (g === 'female') return '👩';
    if (g === 'male') return '👨';
    return '👤';
}

/**
 * Transform a URL to include resizing parameters if the backend/CDN supports it.
 * Currently returns as-is, but can be updated once a CDN is implemented.
 */
export function getResizedImageUrl(url: string | null | undefined, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
    if (!url) return null;
    
    // Example implementation for a future CDN:
    // if (url.includes('firebasestorage.googleapis.com')) {
    //     return `${url}&s=${size === 'small' ? 200 : size === 'medium' ? 500 : 1000}`;
    // }
    
    return url;
}
