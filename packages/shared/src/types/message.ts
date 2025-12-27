/**
 * Message Types - Shared between web and mobile
 */

// Note: the codebase currently contains two message “shapes”:
// - matchId/senderId/recipientId/content (+ createdAt) used in some mobile flows
// - conversationId/fromUserId/toUserId/text (+ createdAt/_creationTime) used in other web/mobile flows
// The shared types intentionally include both sets of fields so UI/utils can share types safely.

export type MessageType =
    | 'text'
    | 'image'
    | 'audio'
    | 'voice'
    | 'gif'
    | 'icebreaker';

export interface Message {
    id: string;
    /** Match identifier (some flows use matchId as the conversation key) */
    matchId?: string;
    /** Sender user id (matchId-based schema) */
    senderId?: string;
    /** Recipient user id (matchId-based schema) */
    recipientId?: string;
    type: MessageType;
    /** Text content (matchId-based schema) */
    content?: string;
    mediaUrl?: string;
    /** Read timestamp (matchId-based schema; some backends store null) */
    readAt?: Date | string | number | null;
    /** Created timestamp (matchId-based schema) */
    createdAt: Date | string | number;

    /** Conversation identifier (conversationId-based schema) */
    conversationId?: string;
    /** Sender user id (conversationId-based schema) */
    fromUserId?: string;
    /** Recipient user id (conversationId-based schema) */
    toUserId?: string;
    /** Text content (conversationId-based schema) */
    text?: string;
    /** UI/Convex compatibility */
    _id?: string;
    _creationTime?: number;
    /** Convenience mirror for read status used in some UI helpers */
    isRead?: boolean;
    /** Voice/audio metadata */
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
    /** Reply metadata (optional) */
    replyToMessageId?: string;
    /** Denormalized preview text of the replied-to message */
    replyToText?: string;
    /** Type of the replied-to message */
    replyToType?: MessageType;
    /** Sender of the replied-to message */
    replyToFromUserId?: string;
    /** Soft delete flag */
    deleted?: boolean;
    /** Edit flag */
    edited?: boolean;
    /** Edit timestamp */
    editedAt?: number;
}

export interface Conversation {
    /** Match identifier (often used as conversation key) */
    matchId: string;
    /** Some APIs return this instead of matchId */
    conversationId?: string;
    participants?: string[];
    /** Current user's ID in the conversation */
    userId?: string;
    /** The other user in the conversation */
    user?: {
        id: string;
        displayName: string | null;
        photoURL: string | null;
    };
    lastMessage?: Message;
    /** Convenience metadata used by some web utilities */
    lastMessageAt?: number;
    unreadCount: number;
    updatedAt: Date | string | number;

    /** UI/Convex compatibility */
    _id?: string;
    id?: string;
}
