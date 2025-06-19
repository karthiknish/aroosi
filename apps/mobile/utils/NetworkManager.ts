import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

class NetworkManager {
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isWifiEnabled: false,
  };

  private listeners: Array<(state: NetworkState) => void> = [];
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadQueueFromStorage();
  }

  /**
   * Initialize network state monitoring
   */
  private async initializeNetworkMonitoring() {
    // Get initial network state
    const state = await NetInfo.fetch();
    this.updateNetworkState(state);

    // Listen for network changes
    NetInfo.addEventListener(this.handleNetworkChange);
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState) => {
    const wasConnected = this.networkState.isConnected;
    this.updateNetworkState(state);

    // If we just came back online, process the queue
    if (!wasConnected && this.networkState.isConnected) {
      this.processQueue();
    }

    // Notify listeners
    this.notifyListeners();
  };

  /**
   * Update internal network state
   */
  private updateNetworkState(state: NetInfoState) {
    this.networkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      isWifiEnabled: state.type === 'wifi',
    };
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.networkState);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of network state changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.networkState));
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  /**
   * Enhanced fetch with retry logic and offline queueing
   */
  async fetch(
    url: string,
    options: RequestInit = {},
    retryConfig: Partial<RetryConfig> = {},
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<Response> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    // If offline, queue the request
    if (!this.isOnline()) {
      return this.queueRequest(url, options, priority);
    }

    return this.executeRequestWithRetry(url, options, config);
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequestWithRetry(
    url: string,
    options: RequestInit,
    config: RetryConfig,
    currentRetry = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        // Add timeout
        signal: AbortSignal.timeout(30000),
      });

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // For 5xx errors, retry
      if (response.status >= 500 && currentRetry < config.maxRetries) {
        await this.delay(this.calculateDelay(currentRetry, config));
        return this.executeRequestWithRetry(url, options, config, currentRetry + 1);
      }

      return response;
    } catch (error) {
      // Network errors - check if we should retry
      if (currentRetry < config.maxRetries) {
        // Check if it's a network error
        if (this.isNetworkError(error)) {
          await this.delay(this.calculateDelay(currentRetry, config));
          return this.executeRequestWithRetry(url, options, config, currentRetry + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Queue request for when connection is restored
   */
  private async queueRequest(
    url: string,
    options: RequestInit,
    priority: 'high' | 'medium' | 'low'
  ): Promise<Response> {
    const requestId = `${Date.now()}-${Math.random()}`;
    
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      options,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    this.requestQueue.push(queuedRequest);
    this.sortQueue();
    await this.saveQueueToStorage();

    // Return a rejected promise that indicates the request was queued
    return Promise.reject(new Error('QUEUED_FOR_RETRY'));
  }

  /**
   * Process queued requests when connection is restored
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.isOnline()) {
      const request = this.requestQueue.shift()!;
      
      try {
        await this.executeRequestWithRetry(request.url, request.options, DEFAULT_RETRY_CONFIG);
        console.log(`Successfully processed queued request: ${request.id}`);
      } catch (error) {
        console.error(`Failed to process queued request: ${request.id}`, error);
        
        // If still failing, put it back in queue with incremented retry count
        if (request.retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
          request.retryCount++;
          this.requestQueue.push(request);
          this.sortQueue();
        }
      }
    }

    await this.saveQueueToStorage();
    this.isProcessingQueue = false;
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue() {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    this.requestQueue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(retryCount: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffFactor, retryCount);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.name === 'NetworkError' ||
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('fetch') ||
      error?.code === 'NETWORK_ERROR'
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save request queue to persistent storage
   */
  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem('networkRequestQueue', JSON.stringify(this.requestQueue));
    } catch (error) {
      console.error('Failed to save request queue:', error);
    }
  }

  /**
   * Load request queue from persistent storage
   */
  private async loadQueueFromStorage() {
    try {
      const queueData = await AsyncStorage.getItem('networkRequestQueue');
      if (queueData) {
        this.requestQueue = JSON.parse(queueData);
        this.sortQueue();
      }
    } catch (error) {
      console.error('Failed to load request queue:', error);
      this.requestQueue = [];
    }
  }

  /**
   * Clear the request queue
   */
  clearQueue() {
    this.requestQueue = [];
    this.saveQueueToStorage();
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      length: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      requests: this.requestQueue.map(req => ({
        id: req.id,
        url: req.url,
        priority: req.priority,
        retryCount: req.retryCount,
        timestamp: req.timestamp,
      })),
    };
  }

  /**
   * Show network error dialog
   */
  showNetworkErrorDialog() {
    Alert.alert(
      'Connection Problem',
      'Unable to connect to the internet. Please check your connection and try again.',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Retry', 
          style: 'default',
          onPress: () => {
            if (this.isOnline()) {
              this.processQueue();
            }
          }
        },
      ]
    );
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();