/**
 * Reactions API - Handles message reactions, delivery receipts, and typing indicators
 */

import { getResponseMessage, isApiEnvelope } from "@/lib/api/safeRequest";

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

type ReactionListResponse = {
  reactions?: Reaction[];
};

class ReactionsAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload: unknown = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(getResponseMessage(payload) ?? `HTTP ${res.status}`);
    }

    if (isApiEnvelope<T>(payload)) {
      if (payload.success === false) {
        throw new Error(getResponseMessage(payload) ?? "Request failed");
      }

      if ("data" in payload) {
        return payload.data as T;
      }
    }

    return payload as T;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<Reaction> {
    return this.makeRequest("/api/reactions", {
      method: "POST",
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    return this.makeRequest("/api/reactions", {
      method: "DELETE",
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  /**
   * Get reactions for a message
   */
  async getReactions(messageId: string): Promise<Reaction[]> {
    const res = await this.makeRequest<ReactionListResponse>(
      `/api/reactions?messageId=${encodeURIComponent(messageId)}`
    );
    return res.reactions ?? [];
  }

  /**
   * Send delivery receipt for messages
   */
  async sendDeliveryReceipt(messageIds: string[]): Promise<void> {
    return this.makeRequest("/api/delivery-receipts", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    });
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, action: "start" | "stop"): Promise<void> {
    return this.makeRequest("/api/typing-indicators", {
      method: "POST",
      body: JSON.stringify({ conversationId, action }),
    });
  }

  /**
   * Get typing status for a conversation
   */
  async getTypingStatus(conversationId: string): Promise<{ typingUsers: string[] }> {
    return this.makeRequest(`/api/typing-indicators?conversationId=${encodeURIComponent(conversationId)}`);
  }
}

export const reactionsAPI = new ReactionsAPI();
