import type { ReportReason, ReportData, Report } from "@aroosi/shared/types";
export type { BlockedUser, BlockStatus, ReportData, ReportResponse, ReportReason, Report };

interface BlockedUser {
  id: string; // block document id (blocker_blocked)
  blockerId: string; // current user id
  blockedUserId: string; // target user id
  createdAt: number; // epoch ms
  // Firestore version no longer embeds full profile snapshot; fetch separately if needed
  blockedProfile?: {
    fullName?: string;
    profileImageUrl?: string;
  };
  // Added by enriched blocked list route
  isBlockedBy?: boolean; // whether the other user also blocked current user
}

interface BlockStatus {
  isBlocked: boolean; // current user blocks target
  isBlockedBy?: boolean; // target blocks current user
  canInteract?: boolean; // derived convenience flag
}

interface ReportResponse {
  message: string;
}

// Local aliases for shared types
type UserReport = Report;
export type { UserReport };

class SafetyAPI {
  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
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

  async reportUser(data: ReportData): Promise<ReportResponse> {
    return this.makeRequest<ReportResponse>("/report", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async blockUser(blockedUserId: string): Promise<{ message: string }> {
    return this.makeRequest("/block", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
    });
  }

  async unblockUser(blockedUserId: string): Promise<{ message: string }> {
    return this.makeRequest("/unblock", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
    });
  }

  async getBlockedUsers(opts?: {
    limit?: number;
    cursor?: string | null;
  }): Promise<{ blockedUsers: BlockedUser[]; nextCursor?: string | null }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString();
    return this.makeRequest(`/blocked${qs ? "?" + qs : ""}`);
  }

  // Overload signatures for backward compatibility
  async checkBlockStatus(userId: string): Promise<BlockStatus>;
  async checkBlockStatus(
    ids: { profileId?: string; userId?: string }
  ): Promise<BlockStatus>;
  async checkBlockStatus(
    arg: string | { profileId?: string; userId?: string }
  ): Promise<BlockStatus> {
    const params = new URLSearchParams();
    if (typeof arg === "string") {
      params.append("userId", arg);
    } else {
      if (arg.profileId) params.append("profileId", arg.profileId);
      if (arg.userId) params.append("userId", arg.userId);
    }
    return this.makeRequest(`/blocked/check?${params.toString()}`);
  }
}

export const safetyAPI = new SafetyAPI();
// No redundant exports needed here as they are all at the top now