interface MatchMessage {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  readAt?: number;
}

interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: MatchMessage;
  lastMessageAt?: number;
  createdAt: number;
}

interface SendMessageParams {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  type?: "text" | "voice" | "image";
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class MatchMessagesAPI {
  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...((options?.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`/api/messages${endpoint}`, {
      headers,
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    return data.data || data;
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<ApiResponse<MatchMessage>> {
    return this.makeRequest<ApiResponse<MatchMessage>>("/send", {
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

    return this.makeRequest<ApiResponse<MatchMessage[]>>(
      `/messages?${queryParams.toString()}`
    );
  }

  async markConversationAsRead(
    params: MarkReadParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>("/mark-read", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getUnreadCounts(userId: string): Promise<ApiResponse<number>> {
    return this.makeRequest<ApiResponse<number>>(`/unread-count/${userId}`);
  }

  // generateUploadUrl removed: multipart uploads are now used directly via /api/messages/upload-image

  async getVoiceMessageUrl(
    params: GetVoiceMessageUrlParams
  ): Promise<ApiResponse<string>> {
    return this.makeRequest<ApiResponse<string>>(
      `/voice-url/${params.storageId}`
    );
  }

  async uploadImage(params: StorageUploadParams): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>("/upload-image", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async deleteImage(params: StorageDeleteParams): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>("/delete-image", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async listImages(userId: string): Promise<ApiResponse<StorageItem[]>> {
    return this.makeRequest<ApiResponse<StorageItem[]>>(
      `/list-images/${userId}`
    );
  }

  async getConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    return this.makeRequest<ApiResponse<Conversation[]>>(
      `/conversations/${userId}`
    );
  }
}

export const matchMessagesAPI = new MatchMessagesAPI();
export type {
  MatchMessage,
  Conversation,
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
