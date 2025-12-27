/**
 * Icebreakers API - Handles icebreaker questions and answers
 */
import type { Icebreaker, IcebreakerAnswer as SharedAnswer } from "@aroosi/shared/types";

// Local aliases for shared types
export type IcebreakerQuestion = Icebreaker;
export type IcebreakerAnswer = SharedAnswer;

export interface UserIcebreaker {
  question: IcebreakerQuestion;
  answer?: IcebreakerAnswer;
}

class IcebreakersAPI {
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
   * Get all icebreaker questions
   */
  async getQuestions(): Promise<IcebreakerQuestion[]> {
    const res = await this.makeRequest("/api/icebreakers");
    return res.data?.questions || res.questions || [];
  }

  /**
   * Get user's icebreaker answers
   */
  async getUserAnswers(userId?: string): Promise<UserIcebreaker[]> {
    const url = userId 
      ? `/api/engagement/icebreakers?userId=${encodeURIComponent(userId)}`
      : "/api/engagement/icebreakers";
    const res = await this.makeRequest(url);
    return res.data?.icebreakers || res.icebreakers || [];
  }

  /**
   * Answer an icebreaker question
   */
  async answerQuestion(questionId: string, answer: string): Promise<IcebreakerAnswer> {
    return this.makeRequest("/api/icebreakers/answer", {
      method: "POST",
      body: JSON.stringify({ questionId, answer }),
    });
  }

  /**
   * Update an icebreaker answer
   */
  async updateAnswer(questionId: string, answer: string): Promise<IcebreakerAnswer> {
    return this.makeRequest("/api/icebreakers/answer", {
      method: "PATCH",
      body: JSON.stringify({ questionId, answer }),
    });
  }

  /**
   * Delete an icebreaker answer
   */
  async deleteAnswer(questionId: string): Promise<void> {
    return this.makeRequest("/api/icebreakers/answer", {
      method: "DELETE",
      body: JSON.stringify({ questionId }),
    });
  }
}

export const icebreakersAPI = new IcebreakersAPI();
