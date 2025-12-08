/**
 * Match Types - Shared between web and mobile
 */

export type MatchStatus = 'pending' | 'matched' | 'rejected' | 'expired';

export interface Match {
    id: string;
    userId1: string;
    userId2: string;
    status: MatchStatus;
    matchedAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Like {
    id: string;
    fromUserId: string;
    toUserId: string;
    isSuperLike?: boolean;
    createdAt: Date | string;
}

export interface MatchWithUser extends Match {
    user: {
        id: string;
        displayName: string | null;
        photoURL: string | null;
        lastActive?: Date | string;
    };
}
