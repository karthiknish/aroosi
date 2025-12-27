/**
 * Shared chat types
 */
import type { ReportReason, MessageType, Message } from "@aroosi/shared/types";
export type { ReportReason };

export type ChatConnectionStatus = "connected" | "connecting" | "disconnected";

export type MatchMessage = Message;