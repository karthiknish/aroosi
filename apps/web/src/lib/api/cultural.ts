/**
 * Cultural API - Handles cultural features, compatibility, and family approval
 */

export interface CulturalProfile {
  userId: string;
  religion?: string;
  sect?: string;
  caste?: string;
  motherTongue?: string;
  ethnicity?: string;
  familyValues?: string[];
  dietaryPreferences?: string[];
}

export interface CulturalCompatibility {
  score: number;
  factors: {
    factor: string;
    weight: number;
    match: boolean;
  }[];
}

export interface FamilyApprovalRequest {
  id: string;
  requesterId: string;
  familyMemberId: string;
  targetUserId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  respondedAt?: string;
}

export interface SupervisedConversation {
  id: string;
  requesterId: string;
  targetUserId: string;
  supervisorId: string;
  status: "pending" | "active" | "ended";
  createdAt: string;
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type CulturalProfileResponse = {
  data?: { profile?: CulturalProfile | null };
  profile?: CulturalProfile | null;
};

type FamilyApprovalResponse = {
  request?: FamilyApprovalRequest;
};

type FamilyApprovalListResponse = {
  data?: { requests?: FamilyApprovalRequest[] };
  requests?: FamilyApprovalRequest[];
};

type SupervisedConversationResponse = {
  data?: { conversation?: SupervisedConversation; conversations?: SupervisedConversation[] };
  conversation?: SupervisedConversation;
  conversations?: SupervisedConversation[];
};

class CulturalAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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
      const payloadError =
        isJson && payload && typeof payload === "object"
          ? (payload as ApiEnvelope<T>).error
          : undefined;
      const msg =
        payloadError ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as ApiEnvelope<T>;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data as T;
        }
      }
    }

    return payload as T;
  }

  // === Cultural Profile ===

  /**
   * Get cultural profile for a user
   */
  async getProfile(userId: string): Promise<CulturalProfile | null> {
    try {
      const res = await this.makeRequest<CulturalProfileResponse>(`/api/cultural/profile/${userId}`);
      return res.data?.profile || res.profile || null;
    } catch {
      return null;
    }
  }

  /**
   * Get cultural compatibility between two users
   */
  async getCompatibility(userId1: string, userId2: string): Promise<CulturalCompatibility> {
    return this.makeRequest(`/api/cultural/compatibility/${userId1}/${userId2}`);
  }

  /**
   * Get culturally matched recommendations
   */
  async getRecommendations(limit = 10): Promise<Record<string, unknown>[]> {
    const res = await this.makeRequest<{
      data?: { recommendations?: Record<string, unknown>[] };
      recommendations?: Record<string, unknown>[];
    }>(`/api/cultural/recommendations?limit=${limit}`);
    return res.data?.recommendations || res.recommendations || [];
  }

  // === Family Approval ===

  /**
   * Request family approval for a match
   */
  async requestFamilyApproval(
    familyMemberId: string,
    relationship: string,
    message?: string
  ): Promise<FamilyApprovalRequest> {
    const res = await this.makeRequest<FamilyApprovalResponse>("/api/cultural/family-approval/request", {
      method: "POST",
      body: JSON.stringify({ familyMemberId, relationship, message }),
    });
    if (res.request) return res.request;
    throw new Error("Invalid family approval response");
  }

  /**
   * Respond to a family approval request
   */
  async respondToFamilyApproval(
    requestId: string,
    action: "approved" | "rejected",
    responseMessage?: string
  ): Promise<FamilyApprovalRequest> {
    const res = await this.makeRequest<FamilyApprovalResponse>("/api/cultural/family-approval/respond", {
      method: "POST",
      body: JSON.stringify({ requestId, action, responseMessage }),
    });
    if (res.request) return res.request;
    throw new Error("Invalid family approval response");
  }

  /**
   * Get pending family approval requests (as requester)
   */
  async getSentApprovalRequests(): Promise<FamilyApprovalRequest[]> {
    const res = await this.makeRequest<FamilyApprovalListResponse>("/api/cultural/family-approval/requests");
    return res.data?.requests || res.requests || [];
  }

  /**
   * Get received family approval requests (as family member)
   */
  async getReceivedApprovalRequests(): Promise<FamilyApprovalRequest[]> {
    const res = await this.makeRequest<FamilyApprovalListResponse>("/api/cultural/family-approval/received");
    return res.data?.requests || res.requests || [];
  }

  // === Supervised Conversations ===

  /**
   * Initiate a supervised conversation
   */
  async initiateSupervisedConversation(targetUserId: string, supervisorId: string): Promise<SupervisedConversation> {
    return this.makeRequest("/api/cultural/supervised-conversation/initiate", {
      method: "POST",
      body: JSON.stringify({ targetUserId, supervisorId }),
    });
  }

  /**
   * Update a supervised conversation.
   */
  async updateSupervisedConversation(
    conversationId: string,
    updates: {
      status?: "pending" | "approved" | "active" | "ended" | "rejected";
      conversationId?: string;
    }
  ): Promise<SupervisedConversation> {
    const res = await this.makeRequest<SupervisedConversationResponse>(`/api/cultural/supervised-conversation/${conversationId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    const conversation = res.data?.conversation || res.conversation;
    if (conversation) return conversation;
    throw new Error("Invalid supervised conversation response");
  }

  /**
   * List supervised conversations
   */
  async listSupervisedConversations(): Promise<SupervisedConversation[]> {
    const res = await this.makeRequest<SupervisedConversationResponse>("/api/cultural/supervised-conversation/list");
    return res.data?.conversations || res.conversations || [];
  }
}

export const culturalAPI = new CulturalAPI();
