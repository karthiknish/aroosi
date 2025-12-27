/**
 * Reactions API - Handles message reactions, delivery receipts, and typing indicators
 */

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

class ReactionsAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    return payload;
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
    const res = await this.makeRequest(`/api/reactions?messageId=${encodeURIComponent(messageId)}`);
    return res.data?.reactions || res.reactions || [];
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
