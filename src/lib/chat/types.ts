/**
 * Shared chat types
 */
export type ChatConnectionStatus = "connected" | "connecting" | "disconnected";

export type ReportReason =
  | "harassment"
  | "inappropriate_content"
  | "spam"
  | "other"
  | string;

export type MatchMessage = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  createdAt: number;
  type?: "text" | "voice";
  audioStorageId?: string | null;
  duration?: number;
};