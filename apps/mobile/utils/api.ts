import { useAuth } from '@clerk/clerk-expo';
import { ApiResponse } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders() {
    const token = await this.getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Profile APIs
  async getProfile() {
    return this.request('/profile');
  }

  async createProfile(profileData: any) {
    return this.request('/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(updates: any) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Search APIs
  async searchProfiles(filters: any) {
    const params = new URLSearchParams(filters);
    return this.request(`/search?${params}`);
  }

  // Interest APIs
  async sendInterest(toUserId: string, fromUserId: string) {
    return this.request('/interests', {
      method: 'POST',
      body: JSON.stringify({ toUserId, fromUserId }),
    });
  }

  async removeInterest(toUserId: string, fromUserId: string) {
    return this.request('/interests', {
      method: 'DELETE',
      body: JSON.stringify({ toUserId, fromUserId }),
    });
  }

  async getSentInterests(userId: string) {
    return this.request(`/interests?userId=${userId}`);
  }

  // Match APIs
  async getMatches() {
    return this.request('/matches');
  }

  async getUnreadCounts() {
    return this.request('/matches/unread');
  }

  // Message APIs
  async getMessages(conversationId: string) {
    return this.request(`/match-messages?conversationId=${conversationId}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request('/match-messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, content }),
    });
  }

  async markMessagesAsRead(conversationId: string) {
    return this.request('/messages/read', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    });
  }

  // Image APIs
  async getUploadUrl(fileName: string, fileType: string) {
    return this.request('/profile-images/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    });
  }

  async updateImageOrder(imageIds: string[]) {
    return this.request('/profile-images/order', {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
    });
  }

  // Subscription APIs
  async createCheckoutSession(planId: 'premium' | 'premiumPlus') {
    return this.request('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  // Profile boost
  async boostProfile() {
    return this.request('/profile/boost', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Hook to initialize API client with auth
export function useApiClient() {
  const { getToken } = useAuth();
  
  // Initialize auth provider once
  if (!apiClient['authInitialized']) {
    apiClient.setAuthProvider(getToken);
    apiClient['authInitialized'] = true;
  }

  return apiClient;
}