import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

export type Message = {
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

export const getMessages = async (
  conversationId: string,
  token: string,
  limit?: number,
  before?: number,
): Promise<Message[]> => {
  try {
    const client = getConvexClient();
    if (!client) {
      throw new Error("Failed to initialize Convex client");
    }

    client.setAuth(token);

    const messages = await client.query(api.messages.getMessages, {
      conversationId,
      limit,
      before,
    });

    return messages as Message[];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const sendMessage = async (message: {
  text: string;
  toUserId: string;
  conversationId: string;
  fromUserId: string;
  token: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}): Promise<Message | null> => {
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

    return savedMessage as Message;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const markConversationRead = async (
  conversationId: string,
  token: string,
): Promise<{ success: boolean }> => {
  try {
    const response = await fetch("/api/messages/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to mark conversation as read");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    throw error;
  }
};
