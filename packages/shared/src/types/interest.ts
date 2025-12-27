/**
 * Interest Types - Shared between web and mobile
 */

export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Interest {
    id: string;
    fromUserId: string;
    toUserId: string;
    status: InterestStatus;
    createdAt: Date | string | number;
    respondedAt?: Date | string | number;
    /** Snapshot of the other user for display purposes */
    user?: {
        userId: string;
        fullName?: string | null;
        profileImageUrls?: string[] | null;
        city?: string | null;
        age?: number;
    };
}

/** Request/response types for interest API */
export interface SendInterestRequest {
    action: 'send';
    toUserId: string;
}

export interface RespondInterestRequest {
    action: 'respond';
    interestId: string;
    status: 'accepted' | 'rejected';
}

export interface RemoveInterestRequest {
    action: 'remove';
    toUserId: string;
}

export type InterestRequest = SendInterestRequest | RespondInterestRequest | RemoveInterestRequest;
