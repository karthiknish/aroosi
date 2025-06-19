import { useAuth } from '@clerk/clerk-expo';
import { ApiResponse } from '../types';
import { networkManager } from './NetworkManager';
import { AppError, errorHandler } from './errorHandling';
import { errorReporter } from './ErrorReporter';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  skipErrorHandling?: boolean;
  priority?: 'high' | 'medium' | 'low';
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
  };
}

class EnhancedApiClient {
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
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      skipErrorHandling = false,
      priority = 'medium',
      retryConfig,
      ...fetchOptions
    } = options;

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();

      // Add breadcrumb for tracking
      errorReporter.addBreadcrumb(`API Request: ${endpoint}`, 'api');

      const requestOptions: RequestInit = {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...fetchOptions.headers,
        },
      };

      // Use enhanced network manager for automatic retry and offline queueing
      const response = await networkManager.fetch(
        url,
        requestOptions,
        retryConfig,
        priority
      );

      const data = await response.json();

      if (!response.ok) {
        const error = new AppError(
          data.error || `HTTP ${response.status}`,
          this.classifyHttpError(response.status),
          { endpoint, status: response.status },
          response.status < 500, // Only retry server errors
          data.userMessage
        );

        if (!skipErrorHandling) {
          errorHandler.handle(error, { endpoint });
          await errorReporter.reportError(error, { endpoint });
        }

        return {
          success: false,
          error: error.userMessage,
        };
      }

      // Add success breadcrumb
      errorReporter.addBreadcrumb(`API Success: ${endpoint}`, 'api');

      return {
        success: true,
        data,
      };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, { endpoint });
      
      if (!skipErrorHandling) {
        await errorReporter.reportError(appError, { endpoint });
      }

      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  private classifyHttpError(status: number): AppError['type'] {
    if (status === 401) return 'authentication';
    if (status === 403) return 'authorization';
    if (status >= 400 && status < 500) return 'validation';
    if (status >= 500) return 'server';
    return 'unknown';
  }

  // Profile APIs with enhanced error handling
  async getProfile() {
    return this.request('/profile', {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getProfileById(profileId: string) {
    return this.request(`/profile-detail/${profileId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async createProfile(profileData: any) {
    return this.request('/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
      priority: 'high',
    });
  }

  async updateProfile(updates: any) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
      priority: 'high',
    });
  }

  // Search APIs
  async searchProfiles(filters: any) {
    const params = new URLSearchParams(filters);
    return this.request(`/search?${params}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  // Interest APIs
  async sendInterest(toUserId: string, fromUserId: string) {
    return this.request('/interests', {
      method: 'POST',
      body: JSON.stringify({ toUserId, fromUserId }),
      priority: 'high',
    });
  }

  async removeInterest(toUserId: string, fromUserId: string) {
    return this.request('/interests', {
      method: 'DELETE',
      body: JSON.stringify({ toUserId, fromUserId }),
      priority: 'high',
    });
  }

  async getSentInterests(userId: string) {
    return this.request(`/interests/sent?userId=${userId}`);
  }

  async getReceivedInterests(userId: string) {
    return this.request(`/interests/received?userId=${userId}`);
  }

  async respondToInterest(interestId: string, response: 'accept' | 'reject') {
    return this.request(`/interests/${interestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
      priority: 'high',
    });
  }

  async getInterestStatus(fromUserId: string, toUserId: string) {
    return this.request(`/interests/status?fromUserId=${fromUserId}&toUserId=${toUserId}`);
  }

  // Safety APIs
  async reportUser(reportedUserId: string, reason: string, description?: string) {
    return this.request('/safety/report', {
      method: 'POST',
      body: JSON.stringify({ reportedUserId, reason, description }),
      priority: 'high',
    });
  }

  async blockUser(blockedUserId: string) {
    return this.request('/safety/block', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId }),
      priority: 'high',
    });
  }

  async unblockUser(blockedUserId: string) {
    return this.request('/safety/unblock', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId }),
      priority: 'high',
    });
  }

  async getBlockedUsers() {
    return this.request('/safety/blocked');
  }

  async checkIfBlocked(userId: string) {
    return this.request(`/safety/blocked/check?userId=${userId}`);
  }

  // Match APIs
  async getMatches() {
    return this.request('/matches', {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getUnreadCounts() {
    return this.request('/matches/unread');
  }

  // Message APIs
  async getMessages(conversationId: string) {
    return this.request(`/match-messages?conversationId=${conversationId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request('/match-messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, content }),
      priority: 'high',
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
      priority: 'high',
    });
  }

  async uploadImageToUrl(uploadUrl: string, imageData: any, contentType: string) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: imageData,
      });
      
      return { success: response.ok };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, { action: 'image_upload' });
      await errorReporter.reportError(appError, { action: 'image_upload' });
      
      return { 
        success: false, 
        error: appError.userMessage,
      };
    }
  }

  async confirmImageUpload(fileName: string, uploadId: string) {
    return this.request('/profile-images/confirm', {
      method: 'POST',
      body: JSON.stringify({ fileName, uploadId }),
      priority: 'high',
    });
  }

  async deleteProfileImage(imageId: string) {
    return this.request(`/profile-images/${imageId}`, {
      method: 'DELETE',
      priority: 'high',
    });
  }

  async updateImageOrder(imageIds: string[]) {
    return this.request('/profile-images/order', {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
      priority: 'high',
    });
  }

  async getProfileImages() {
    return this.request('/profile-images');
  }

  async setMainProfileImage(imageId: string) {
    return this.request('/profile-images/main', {
      method: 'PUT',
      body: JSON.stringify({ imageId }),
      priority: 'high',
    });
  }

  // Subscription APIs
  async createCheckoutSession(planId: 'premium' | 'premiumPlus') {
    return this.request('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
      priority: 'high',
    });
  }

  // Profile boost
  async boostProfile() {
    return this.request('/profile/boost', {
      method: 'POST',
      priority: 'high',
    });
  }

  // Profile view tracking
  async recordProfileView(viewedUserId: string) {
    return this.request('/profile/view', {
      method: 'POST',
      body: JSON.stringify({ viewedUserId }),
      priority: 'medium',
    });
  }

  async getProfileViewers() {
    return this.request('/profile/view', {
      retryConfig: { maxRetries: 2 },
    });
  }

  // User management
  async deleteProfile() {
    return this.request('/profile', {
      method: 'DELETE',
      priority: 'high',
    });
  }

  async getCurrentUser() {
    return this.request('/user/me', {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Blog APIs
  async getBlogPosts(params: { page?: number; pageSize?: number; category?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.category) searchParams.set('category', params.category);
    
    return this.request(`/blog?${searchParams}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async getBlogPost(slug: string) {
    return this.request(`/blog/${slug}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async createBlogPost(blogData: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    imageUrl?: string;
    categories: string[];
  }) {
    return this.request('/blog', {
      method: 'POST',
      body: JSON.stringify(blogData),
      priority: 'high',
    });
  }

  async deleteBlogPost(id: string) {
    return this.request('/blog', {
      method: 'DELETE',
      body: JSON.stringify({ _id: id }),
      priority: 'high',
    });
  }

  async getBlogImages() {
    return this.request('/images/blog');
  }

  // Contact & Support
  async submitContactForm(contactData: {
    email: string;
    name: string;
    subject: string;
    message: string;
  }) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
      priority: 'high',
    });
  }

  async getContactSubmissions() {
    return this.request('/contact');
  }

  // AI Chat
  async sendChatMessage(data: { messages: any[]; email: string }) {
    return this.request('/gemini-chat', {
      method: 'POST',
      body: JSON.stringify(data),
      priority: 'medium',
    });
  }

  async saveChatbotMessage(messageData: any) {
    return this.request('/saveChatbotMessage', {
      method: 'POST',
      body: JSON.stringify(messageData),
      priority: 'low',
    });
  }

  async convertAITextToHTML(text: string) {
    return this.request('/convert-ai-text-to-html', {
      method: 'POST',
      body: JSON.stringify({ text }),
      priority: 'medium',
    });
  }

  // Push Notifications
  async registerForPushNotifications(playerId: string) {
    return this.request('/push/register', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
      priority: 'high',
    });
  }

  // Interest Management - Extended
  async getInterests(params: { userId?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set('userId', params.userId);
    
    return this.request(`/interests?${searchParams}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async respondToInterestByStatus(data: { interestId: string; status: 'accepted' | 'rejected' }) {
    return this.request('/interests/respond', {
      method: 'POST',
      body: JSON.stringify(data),
      priority: 'high',
    });
  }

  // Messaging - Extended
  async getConversationEvents(conversationId: string) {
    return this.request(`/conversations/${conversationId}/events`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Public APIs (no auth required)
  async getPublicProfile() {
    return this.request('/public-profile', {
      skipErrorHandling: false,
      retryConfig: { maxRetries: 2 },
    });
  }

  async getProfileDetailImages(profileId: string) {
    return this.request(`/profile-detail/${profileId}/images`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Search - Extended
  async searchImages(params: any) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/search-images?${searchParams}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  // Profile Images - Extended
  async getProfileImageUploadUrl(data: { fileName: string; fileType: string }) {
    return this.request('/profile-images/upload-url', {
      method: 'GET',
      // Note: Some endpoints might use GET with query params instead of POST
    });
  }

  async batchProfileImageOperations(operations: any[]) {
    return this.request('/profile-images/batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
      priority: 'high',
    });
  }

  async batchProfileOperations(operations: any[]) {
    return this.request('/profile/batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
      priority: 'high',
    });
  }

  // Admin APIs (require admin role)
  async adminListProfiles(params: { 
    search?: string; 
    page?: number; 
    pageSize?: number 
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return this.request(`/admin/profiles?${searchParams}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminUpdateProfile(profileData: any) {
    return this.request('/admin/profiles', {
      method: 'PUT',
      body: JSON.stringify(profileData),
      priority: 'high',
    });
  }

  async adminDeleteProfile(profileId: string) {
    return this.request('/admin/profiles', {
      method: 'DELETE',
      body: JSON.stringify({ profileId }),
      priority: 'high',
    });
  }

  async adminGetProfile(profileId: string) {
    return this.request(`/admin/profiles/${profileId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminUpdateSpecificProfile(profileId: string, updates: any) {
    return this.request(`/admin/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      priority: 'high',
    });
  }

  async adminBanUser(profileId: string, reason?: string) {
    return this.request(`/admin/profiles/${profileId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      priority: 'high',
    });
  }

  async adminToggleSpotlight(profileId: string, enabled: boolean) {
    return this.request(`/admin/profiles/${profileId}/spotlight`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
      priority: 'high',
    });
  }

  async adminReorderUserImages(profileId: string, imageIds: string[]) {
    return this.request(`/admin/profiles/${profileId}/images/order`, {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
      priority: 'high',
    });
  }

  async adminGetUserMatches(profileId: string) {
    return this.request(`/admin/profiles/${profileId}/matches`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminListMatches() {
    return this.request('/admin/matches', {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminCreateMatch(data: { userId1: string; userId2: string }) {
    return this.request('/admin/matches/create', {
      method: 'POST',
      body: JSON.stringify(data),
      priority: 'high',
    });
  }

  async adminListInterests() {
    return this.request('/admin/interests', {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Subscription & Usage APIs
  async getSubscriptionStatus() {
    return this.request('/subscription/status', {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getUsageStats() {
    return this.request('/subscription/usage', {
      retryConfig: { maxRetries: 2 },
    });
  }

  async purchaseSubscription(productId: string, purchaseToken: string) {
    return this.request('/subscription/purchase', {
      method: 'POST',
      body: JSON.stringify({ productId, purchaseToken }),
      priority: 'high',
    });
  }

  async cancelSubscription() {
    return this.request('/subscription/cancel', {
      method: 'POST',
      priority: 'high',
    });
  }

  async restorePurchases() {
    return this.request('/subscription/restore', {
      method: 'POST',
      priority: 'high',
    });
  }

  async updateSubscriptionTier(tier: string) {
    return this.request('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier }),
      priority: 'high',
    });
  }

  async trackFeatureUsage(feature: string) {
    return this.request('/subscription/track-usage', {
      method: 'POST',
      body: JSON.stringify({ feature }),
      priority: 'low',
    });
  }

  // Enhanced Messaging Features
  async sendTypingIndicator(conversationId: string, action: 'start' | 'stop') {
    return this.request('/typing-indicators', {
      method: 'POST',
      body: JSON.stringify({ conversationId, action }),
      priority: 'low',
    });
  }

  async getTypingIndicators(conversationId: string) {
    return this.request(`/typing-indicators/${conversationId}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async sendDeliveryReceipt(messageId: string, status: string) {
    return this.request('/delivery-receipts', {
      method: 'POST',
      body: JSON.stringify({ messageId, status }),
      priority: 'low',
    });
  }

  async getDeliveryReceipts(conversationId: string) {
    return this.request(`/delivery-receipts/${conversationId}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async markConversationAsRead(conversationId: string) {
    return this.request(`/conversations/${conversationId}/mark-read`, {
      method: 'POST',
      priority: 'medium',
    });
  }

  // Voice Messages
  async uploadVoiceMessage(audioBlob: Blob, conversationId: string, duration: number) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.m4a');
    formData.append('conversationId', conversationId);
    formData.append('duration', duration.toString());

    try {
      const authHeaders = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/voice-messages/upload`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          // Don't set Content-Type for FormData
        },
        body: formData,
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
      const appError = errorHandler.handle(error as Error, { action: 'voice_upload' });
      await errorReporter.reportError(appError, { action: 'voice_upload' });
      
      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  async getVoiceMessageUrl(messageId: string) {
    return this.request(`/voice-messages/${messageId}/url`, {
      retryConfig: { maxRetries: 2 },
    });
  }
}

export const enhancedApiClient = new EnhancedApiClient(API_BASE_URL);

// Hook to initialize API client with auth
export function useEnhancedApiClient() {
  const { getToken } = useAuth();
  
  // Initialize auth provider once
  if (!enhancedApiClient['authInitialized']) {
    enhancedApiClient.setAuthProvider(getToken);
    enhancedApiClient['authInitialized'] = true;
  }

  return enhancedApiClient;
}