/**
 * Match Types - Shared between web and mobile
 */

export type MatchStatus = 'pending' | 'matched' | 'rejected' | 'expired';

export interface Match {
    id: string;
    /** For normalized storage */
    userId1?: string;
    userId2?: string;
    /** For mobile display */
    matchedUserId?: string;
    matchedUser?: {
        id: string;
        displayName: string | null;
        photoURL: string | null;
        age?: number;
        bio?: string;
        lastActive?: string | Date;
    };
    status: MatchStatus;
    matchedAt?: Date | string;
    createdAt: Date | string;
    updatedAt?: Date | string;
    lastMessage?: {
        content: string;
        createdAt: Date | string;
        senderId: string;
    };
    unreadCount?: number;
}

export interface Like {
    id: string;
    fromUserId?: string;
    toUserId?: string;
    /** Mobile alias */
    userId?: string;
    likedUserId?: string;
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
