// Import centralized types
import { ApiResponse, ApiError } from "@/lib/utils/apiResponse";
import type { Message, MessageType } from "@aroosi/shared/types";

// Local aliases for shared types if needed, or just use shared types directly
type MatchMessage = Message;

interface SendMessageParams {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  type?: MessageType;
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}

interface GetMessagesParams {
  conversationId: string;
  limit?: number;
  before?: number;
}

interface MarkReadParams {
  conversationId: string;
  userId: string;
}

class MatchMessagesAPI {
  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...((options?.headers as Record<string, string>) || {}),
    };

    try {
      const response = await fetch(`/api/messages${endpoint}`, {
        headers,
        credentials: "include",
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorText || `HTTP ${response.status}`,
            details: {
              status: response.status,
              statusText: response.statusText,
            },
          },
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: {
            code: "API_ERROR",
            message: data.error || "Request failed",
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
          details: error,
        },
      };
    }
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<ApiResponse<MatchMessage>> {
    return this.makeRequest<MatchMessage>("/send", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getMessages(
    params: GetMessagesParams
  ): Promise<ApiResponse<MatchMessage[]>> {
    const queryParams = new URLSearchParams({
      conversationId: params.conversationId,
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.before && { before: params.before.toString() }),
    });

    const response = await this.makeRequest<{ messages?: MatchMessage[] }>(
      `?${queryParams.toString()}`
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: Array.isArray(response.data?.messages)
        ? response.data.messages
        : [],
    };
  }

  async markConversationAsRead(
    params: MarkReadParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<void>("/mark-read", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export const matchMessagesAPI = new MatchMessagesAPI();
export type {
  MatchMessage,
  SendMessageParams,
  GetMessagesParams,
  MarkReadParams,
  ApiResponse,
};

// Backward compatibility exports
export const matchMessages = {
  sendMessage: (params: SendMessageParams) =>
    matchMessagesAPI.sendMessage(params),
  getMessages: (params: GetMessagesParams) =>
    matchMessagesAPI.getMessages(params),
  markConversationAsRead: (params: MarkReadParams) =>
    matchMessagesAPI.markConversationAsRead(params),
};

export default matchMessages;
