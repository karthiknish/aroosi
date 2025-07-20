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

interface GenerateUploadUrlParams {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

interface GenerateUploadUrlResponse {
  uploadUrl: string;
  storageId: string;
}

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
    options?: RequestInit,
    token?: string | null
  ): Promise<T> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`/api/messages${endpoint}`, {
      headers,
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
    token: string | null,
    params: SendMessageParams
  ): Promise<ApiResponse<MatchMessage>> {
    return this.makeRequest<ApiResponse<MatchMessage>>(
      "/send",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      token
    );
  }

  async getMessages(
    token: string | null,
    params: GetMessagesParams
  ): Promise<ApiResponse<MatchMessage[]>> {
    const queryParams = new URLSearchParams({
      conversationId: params.conversationId,
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.before && { before: params.before.toString() }),
    });

    return this.makeRequest<ApiResponse<MatchMessage[]>>(
      `/messages?${queryParams.toString()}`,
      undefined,
      token
    );
  }

  async markConversationAsRead(
    token: string | null,
    params: MarkReadParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(
      "/mark-read",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      token
    );
  }

  async getUnreadCounts(
    token: string | null,
    userId: string
  ): Promise<ApiResponse<number>> {
    return this.makeRequest<ApiResponse<number>>(
      `/unread-count/${userId}`,
      undefined,
      token
    );
  }

  async generateUploadUrl(
    token: string | null,
    params: GenerateUploadUrlParams
  ): Promise<ApiResponse<GenerateUploadUrlResponse>> {
    return this.makeRequest<ApiResponse<GenerateUploadUrlResponse>>(
      "/upload-url",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      token
    );
  }

  async getVoiceMessageUrl(
    token: string | null,
    params: GetVoiceMessageUrlParams
  ): Promise<ApiResponse<string>> {
    return this.makeRequest<ApiResponse<string>>(
      `/voice-url/${params.storageId}`,
      undefined,
      token
    );
  }

  async uploadImage(
    token: string | null,
    params: StorageUploadParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(
      "/upload-image",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      token
    );
  }

  async deleteImage(
    token: string | null,
    params: StorageDeleteParams
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(
      "/delete-image",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      token
    );
  }

  async listImages(
    token: string | null,
    userId: string
  ): Promise<ApiResponse<StorageItem[]>> {
    return this.makeRequest<ApiResponse<StorageItem[]>>(
      `/list-images/${userId}`,
      undefined,
      token
    );
  }

  async getConversations(
    token: string | null,
    userId: string
  ): Promise<ApiResponse<Conversation[]>> {
    return this.makeRequest<ApiResponse<Conversation[]>>(
      `/conversations/${userId}`,
      undefined,
      token
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
  GenerateUploadUrlParams,
  GenerateUploadUrlResponse,
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
    matchMessagesAPI.sendMessage(null, params),
  getMessages: (params: GetMessagesParams) =>
    matchMessagesAPI.getMessages(null, params),
  markConversationAsRead: (params: MarkReadParams) =>
    matchMessagesAPI.markConversationAsRead(null, params),
  getUnreadCounts: (userId: string) =>
    matchMessagesAPI.getUnreadCounts(null, userId),
  generateUploadUrl: (params: GenerateUploadUrlParams) =>
    matchMessagesAPI.generateUploadUrl(null, params),
  getVoiceMessageUrl: (params: GetVoiceMessageUrlParams) =>
    matchMessagesAPI.getVoiceMessageUrl(null, params),
  uploadImage: (params: StorageUploadParams) =>
    matchMessagesAPI.uploadImage(null, params),
  deleteImage: (params: StorageDeleteParams) =>
    matchMessagesAPI.deleteImage(null, params),
  listImages: (userId: string) => matchMessagesAPI.listImages(null, userId),
  getConversations: (userId: string) =>
    matchMessagesAPI.getConversations(null, userId),
};

export default matchMessages;
