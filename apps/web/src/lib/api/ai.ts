/**
 * AI API - Handles AI/Gemini operations
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GeminiChatMessage {
  role: string;
  text: string;
}

export interface GeminiChatResponse {
  reply: string;
}

export interface ChatResponse {
  message: string;
  conversationId?: string;
}

class AIAPI {
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

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data;
        }
      }
    }

    return payload;
  }

  /**
   * Send a message to Gemini chat (Aroosi chatbot)
   * POST /api/gemini-chat
   */
  async geminiChat(messages: GeminiChatMessage[], email: string): Promise<GeminiChatResponse> {
    const res = await this.makeRequest("/api/gemini-chat", {
      method: "POST",
      body: JSON.stringify({ messages, email }),
    });
    // This route returns { reply }
    const reply = String(res?.reply ?? res?.data?.reply ?? "");
    return { reply };
  }

  /**
   * Legacy/other chat helper (kept for backward compatibility)
   */
  async chat(messages: ChatMessage[], conversationId?: string): Promise<ChatResponse> {
    const res = await this.makeRequest("/api/gemini-chat", {
      method: "POST",
      body: JSON.stringify({ messages, conversationId }),
    });
    return {
      message: res.data?.message || res.message || "",
      conversationId: res.data?.conversationId || res.conversationId,
    };
  }

  /**
   * Convert AI-generated text to HTML
   */
  async convertToHtml(text: string, format?: "blog" | "email" | "default"): Promise<string> {
    const res = await this.makeRequest("/api/convert-ai-text-to-html", {
      method: "POST",
      body: JSON.stringify({ text, format }),
    });
    return res.data?.html || res.html || "";
  }

  /**
   * Save a chatbot message (for conversation history)
   */
  async saveChatMessage(conversationId: string, message: ChatMessage): Promise<void> {
    return this.makeRequest("/api/saveChatbotMessage", {
      method: "POST",
      body: JSON.stringify({ conversationId, message }),
    });
  }
}

export const aiAPI = new AIAPI();
