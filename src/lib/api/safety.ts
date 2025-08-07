interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedProfile: {
    fullName: string;
    profileImageUrl?: string;
    userId: string;
  };
  createdAt: string;
}

interface BlockStatus {
  isBlocked: boolean;
  isBlockedBy?: boolean;
  canInteract?: boolean;
}

type ReportReason = 
  | 'inappropriate_content'
  | 'harassment' 
  | 'fake_profile'
  | 'spam'
  | 'safety_concern'
  | 'inappropriate_behavior'
  | 'other';

interface ReportData {
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}

interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

interface ReportResponse {
  message: string;
}

class SafetyAPI {
  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit,
    _token?: string | null
  ): Promise<T> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...((options?.headers as Record<string, string>) || {}),
    };


    const response = await fetch(`/api/safety${endpoint}`, {
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

  async reportUser(
    token: string | null,
    data: ReportData
  ): Promise<ReportResponse> {
    return this.makeRequest<ReportResponse>(
      "/report",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token
    );
  }

  async blockUser(
    token: string | null,
    blockedUserId: string
  ): Promise<{ message: string }> {
    return this.makeRequest(
      "/block",
      {
        method: "POST",
        body: JSON.stringify({ blockedUserId }),
      },
      token
    );
  }

  async unblockUser(
    token: string | null,
    blockedUserId: string
  ): Promise<{ message: string }> {
    return this.makeRequest(
      "/unblock",
      {
        method: "POST",
        body: JSON.stringify({ blockedUserId }),
      },
      token
    );
  }

  async getBlockedUsers(
    token: string | null
  ): Promise<{ blockedUsers: BlockedUser[] }> {
    return this.makeRequest("/blocked", undefined, token);
  }

  // Overload signatures for backward compatibility
  async checkBlockStatus(
    token: string | null,
    userId: string
  ): Promise<BlockStatus>;
  async checkBlockStatus(
    token: string | null,
    ids: { profileId?: string; userId?: string }
  ): Promise<BlockStatus>;
  async checkBlockStatus(
    token: string | null,
    arg: string | { profileId?: string; userId?: string }
  ): Promise<BlockStatus> {
    const params = new URLSearchParams();
    if (typeof arg === "string") {
      params.append("userId", arg);
    } else {
      if (arg.profileId) params.append("profileId", arg.profileId);
      if (arg.userId) params.append("userId", arg.userId);
    }
    return this.makeRequest(
      `/blocked/check?${params.toString()}`,
      undefined,
      token
    );
  }
}

export const safetyAPI = new SafetyAPI();
export type { BlockedUser, BlockStatus, ReportData, ReportResponse, ReportReason, UserReport };