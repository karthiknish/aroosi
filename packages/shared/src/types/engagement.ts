/**
 * Engagement Types - Shared between web and mobile
 * Includes quick picks, shortlists, and notes
 */

export interface QuickPickProfile {
    userId: string;
    fullName?: string | null;
    profileImageUrls?: string[] | null;
    /** Legacy alias for backward compatibility */
    imageUrl?: string | null;
    city?: string | null;
    age?: number;
}

export interface ShortlistEntry {
    id: string;
    userId: string;
    /** @deprecated Use shortlistedUserId */
    toUserId?: string;
    shortlistedUserId: string;
    /** User's full name (denormalized for display) */
    fullName?: string | null;
    /** User's profile images (denormalized for display) */
    profileImageUrls?: string[] | null;
    createdAt: Date | string | number;
    user?: QuickPickProfile;
}

export interface NoteData {
    userId: string;
    note: string;
}

export interface UserNote {
    id: string;
    fromUserId: string;
    toUserId: string;
    /** @deprecated Use note */
    content?: string;
    note: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
