import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

// Unified API response structure aligned with mobile
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Message type for match messages - aligned with mobile
export type MatchMessage = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";

  // Voice message fields
  audioStorageId?: string;
  duration?: number;

  // Image message fields
  imageStorageId?: string;

  // Common metadata
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  readAt?: number;

  // Client-side fields
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  isOptimistic?: boolean;
};

// Unified API client aligned with mobile implementation
export const getMatchMessages = async (params: {
  conversationId: string;
  token: string;
  limit?: number;
  before?: number;
}): Promise<ApiResponse<MatchMessage[]>> => {
  try {
    const client = getConvexClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: "CLIENT_ERROR",
          message: "Failed to initialize Convex client",
        },
      };
    }

    client.setAuth(params.token);

    const messages = await client.query(api.messages.getMessages, {
      conversationId: params.conversationId,
      limit: params.limit || 50,
      before: params.before,
    });

    // Normalize messages for backward compatibility
    const normalizedMessages = messages.map(normalizeMessage);

    return {
      success: true,
      data: normalizedMessages as MatchMessage[],
    };
  } catch (error) {
    console.error("Error fetching match messages:", error);
    return {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch messages",
      },
    };
  }
};

export const sendMatchMessage = async (data: {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  token: string;
}): Promise<ApiResponse<MatchMessage>> => {
  try {
    const client = getConvexClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: "CLIENT_ERROR",
          message: "Failed to initialize Convex client",
        },
      };
    }

    client.setAuth(data.token);

    const savedMessage = await client.mutation(api.messages.sendMessage, {
      conversationId: data.conversationId,
      fromUserId: data.fromUserId as Id<"users">,
      toUserId: data.toUserId as Id<"users">,
      text: data.text || "",
      type: data.type || "text",
      audioStorageId: data.audioStorageId,
      duration: data.duration,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
    });

    // Normalize message for backward compatibility
    const normalizedMessage = normalizeMessage(savedMessage);

    return {
      success: true,
      data: normalizedMessage as MatchMessage,
    };
  } catch (error) {
    console.error("Error sending match message:", error);
    return {
      success: false,
      error: {
        code: "SEND_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to send message",
      },
    };
  }
};

// Mark conversation as read - aligned with mobile API
export const markConversationAsRead = async (params: {
  conversationId: string;
  token: string;
}): Promise<ApiResponse<void>> => {
  try {
    const client = getConvexClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: "CLIENT_ERROR",
          message: "Failed to initialize Convex client",
        },
      };
    }

    client.setAuth(params.token);

    await client.mutation(api.messages.markConversationAsRead, {
      conversationId: params.conversationId,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return {
      success: false,
      error: {
        code: "READ_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to mark as read",
      },
    };
  }
};

// Voice message operations - aligned with mobile API
export const generateVoiceUploadUrl = async (
  token: string
): Promise<ApiResponse<{ uploadUrl: string; storageId: string }>> => {
  try {
    const client = getConvexClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: "CLIENT_ERROR",
          message: "Failed to initialize Convex client",
        },
      };
    }

    client.setAuth(token);

    const result = await client.mutation(api.storage.generateUploadUrl);

    return {
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        storageId: result.storageId,
      },
    };
  } catch (error) {
    console.error("Error generating voice upload URL:", error);
    return {
      success: false,
      error: {
        code: "UPLOAD_URL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate upload URL",
      },
    };
  }
};

export const getVoiceMessageUrl = async (params: {
  storageId: string;
  token: string;
}): Promise<ApiResponse<{ url: string }>> => {
  try {
    const client = getConvexClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: "CLIENT_ERROR",
          message: "Failed to initialize Convex client",
        },
      };
    }

    client.setAuth(params.token);

    const url = await client.query(api.storage.getUrl, {
      storageId: params.storageId,
    });

    return {
      success: true,
      data: { url: url || "" },
    };
  } catch (error) {
    console.error("Error getting voice message URL:", error);
    return {
      success: false,
      error: {
        code: "URL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get voice message URL",
      },
    };
  }
};

// Message normalization for backward compatibility - aligned with mobile
function normalizeMessage(rawMessage: any): MatchMessage {
  return {
    _id: rawMessage._id || rawMessage.id,
    conversationId: rawMessage.conversationId,
    fromUserId: rawMessage.fromUserId || rawMessage.senderId,
    toUserId: rawMessage.toUserId || rawMessage.recipientId,
    text: rawMessage.text || rawMessage.content || "",
    type: rawMessage.type || "text",
    createdAt: rawMessage.createdAt || rawMessage.timestamp || Date.now(),
    readAt: rawMessage.readAt,

    // Voice message fields
    audioStorageId: rawMessage.audioStorageId,
    duration: rawMessage.duration || rawMessage.voiceDuration,

    // Image message fields
    imageStorageId: rawMessage.imageStorageId,

    // Common metadata
    fileSize: rawMessage.fileSize,
    mimeType: rawMessage.mimeType,

    // Client-side fields
    status: normalizeMessageStatus(rawMessage.status),
    isOptimistic: rawMessage.isOptimistic || false,
  };
}

// Normalize message status for consistency - aligned with mobile
function normalizeMessageStatus(
  status: any
): "pending" | "sent" | "delivered" | "read" | "failed" | undefined {
  if (!status) return undefined;

  // Map legacy statuses to new ones
  switch (status) {
    case "sending":
      return "pending";
    case "sent":
    case "delivered":
    case "read":
    case "failed":
      return status;
    default:
      return "sent"; // Default fallback
  }
}
