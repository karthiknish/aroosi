// Import centralized types
import { ApiResponse, ApiError } from "@/lib/utils/apiResponse";
import type { Message, Conversation, MessageType } from "@aroosi/shared/types";

// Local aliases for shared types if needed, or just use shared types directly
type MatchMessage = Message;
type ConversationData = Conversation;

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

// Deprecated upload-url types removed (multipart upload is used instead)

interface GetVoiceMessageUrlParams {
  storageId: string;
}

interface StorageUploadParams {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  storageId: string;
}

interface StorageDeleteParams {
  storageId: string;
  userId: string;
}

interface StorageListParams {
  userId: string;
}

interface StorageItem {
  _id: string;
  url: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: number;
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

    return this.makeRequest<MatchMessage[]>(
      `/messages?${queryParams.toString()}`
    );
  }

  async markConversationAsRead(
    params: MarkReadParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<void>("/mark-read", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getUnreadCounts(userId: string): Promise<ApiResponse<number>> {
    return this.makeRequest<number>(`/unread-count/${userId}`);
  }

  // generateUploadUrl removed: multipart uploads are now used directly via /api/messages/upload-image

  async getVoiceMessageUrl(
    params: GetVoiceMessageUrlParams
  ): Promise<ApiResponse<string>> {
    return this.makeRequest<string>(`/voice-url/${params.storageId}`);
  }

  async uploadImage(params: StorageUploadParams): Promise<ApiResponse<void>> {
    return this.makeRequest<void>("/upload-image", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async deleteImage(params: StorageDeleteParams): Promise<ApiResponse<void>> {
    return this.makeRequest<void>("/delete-image", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async listImages(userId: string): Promise<ApiResponse<StorageItem[]>> {
    return this.makeRequest<StorageItem[]>(`/list-images/${userId}`);
  }

  async getConversations(userId: string): Promise<ApiResponse<ConversationData[]>> {
    return this.makeRequest<ConversationData[]>(`/conversations/${userId}`);
  }
}

export const matchMessagesAPI = new MatchMessagesAPI();
export type {
  MatchMessage,
  ConversationData as Conversation,
  SendMessageParams,
  GetMessagesParams,
  MarkReadParams,
  GetVoiceMessageUrlParams,
  StorageUploadParams,
  StorageDeleteParams,
  StorageListParams,
  StorageItem,
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
  getUnreadCounts: (userId: string) => matchMessagesAPI.getUnreadCounts(userId),
  getVoiceMessageUrl: (params: GetVoiceMessageUrlParams) =>
    matchMessagesAPI.getVoiceMessageUrl(params),
  uploadImage: (params: StorageUploadParams) =>
    matchMessagesAPI.uploadImage(params),
  deleteImage: (params: StorageDeleteParams) =>
    matchMessagesAPI.deleteImage(params),
  listImages: (userId: string) => matchMessagesAPI.listImages(userId),
  getConversations: (userId: string) =>
    matchMessagesAPI.getConversations(userId),
};

export default matchMessages;
