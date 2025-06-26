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
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api/safety${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data.data || data;
  }

  async reportUser(data: ReportData): Promise<ReportResponse> {
    return this.makeRequest<ReportResponse>('/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async blockUser(blockedUserId: string): Promise<{ message: string }> {
    return this.makeRequest('/block', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId }),
    });
  }

  async unblockUser(blockedUserId: string): Promise<{ message: string }> {
    return this.makeRequest('/unblock', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId }),
    });
  }

  async getBlockedUsers(): Promise<{ blockedUsers: BlockedUser[] }> {
    return this.makeRequest('/blocked');
  }

  async checkBlockStatus(userId: string): Promise<BlockStatus> {
    return this.makeRequest(`/blocked/check?userId=${encodeURIComponent(userId)}`);
  }
}

export const safetyAPI = new SafetyAPI();
export type { BlockedUser, BlockStatus, ReportData, ReportResponse, ReportReason, UserReport };