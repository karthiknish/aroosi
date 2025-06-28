import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

// Message type for match messages
export type MatchMessage = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  readAt?: number;
};

export const getMatchMessages = async (params: {
  conversationId: string;
  token: string;
  limit: number;
  before?: number;
}): Promise<MatchMessage[]> => {
  try {
    const client = getConvexClient();
    if (!client) {
      throw new Error("Failed to initialize Convex client");
    }

    client.setAuth(params.token);

    const messages = await client.query(api.messages.getMessages, {
      conversationId: params.conversationId,
      limit: params.limit,
      before: params.before,
    });

    return messages as MatchMessage[];
  } catch (error) {
    console.error("Error fetching match messages:", error);
    throw error;
  }
};

export const sendMatchMessage = async (message: {
  text: string;
  toUserId: string;
  fromUserId: string;
  conversationId: string;
  token: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}): Promise<MatchMessage | null> => {
  try {
    const client = getConvexClient();
    if (!client) {
      throw new Error("Failed to initialize Convex client");
    }

    client.setAuth(message.token);

    const savedMessage = await client.mutation(api.messages.sendMessage, {
      conversationId: message.conversationId,
      fromUserId: message.fromUserId as Id<"users">,
      toUserId: message.toUserId as Id<"users">,
      text: message.text,
      type: message.type,
      audioStorageId: message.audioStorageId,
      duration: message.duration,
      fileSize: message.fileSize,
      mimeType: message.mimeType,
    });

    return savedMessage as MatchMessage;
  } catch (error) {
    console.error("Error sending match message:", error);
    throw error;
  }
};
