export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface OfflineCacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string;
  maxSize?: number; // Maximum cache size in MB
  persist?: boolean; // Whether to persist across sessions
}

const DEFAULT_OPTIONS: Required<OfflineCacheOptions> = {
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  version: '1.0',
  maxSize: 50, // 50MB
  persist: true,
};

class OfflineCache {
  private cache = new Map<string, CacheEntry>();
  private options: Required<OfflineCacheOptions>;
  private storage: Storage | null = null;
  private size = 0;

  constructor(options: OfflineCacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (typeof window !== 'undefined' && this.options.persist) {
      this.storage = localStorage;
      this.loadFromStorage();
    }

    // Clean up expired entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000); // Clean every 5 minutes
    }
  }

  set<T>(key: string, data: T, options: Partial<OfflineCacheOptions> = {}): void {
    const opts = { ...this.options, ...options };
    const now = Date.now();
    const expiresAt = now + opts.ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      version: opts.version,
    };

    // Check size constraints
    const entrySize = this.estimateSize(entry);
    if (this.size + entrySize > this.options.maxSize * 1024 * 1024) {
      this.evictOldEntries(entrySize);
    }

    this.cache.set(key, entry);
    this.size += entrySize;

    if (this.storage) {
      this.saveToStorage(key, entry);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() <= entry.expiresAt : false;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.size -= this.estimateSize(entry);
      this.cache.delete(key);

      if (this.storage) {
        this.storage.removeItem(this.getStorageKey(key));
      }

      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.size = 0;

    if (this.storage) {
      // Clear all cache entries from storage
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith('offline_cache_')) {
          this.storage!.removeItem(key);
        }
      });
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    entries: number;
    hitRate: number;
  } {
    return {
      size: this.size,
      entries: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for this
    };
  }

  private estimateSize(entry: CacheEntry): number {
    // Rough estimation of entry size in bytes
    return JSON.stringify(entry).length * 2; // 2 bytes per character for UTF-16
  }

  private evictOldEntries(requiredSize: number): void {
    // Simple LRU eviction - remove oldest entries first
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);

    let freedSize = 0;
    for (const [key] of entries) {
      const entry = this.cache.get(key)!;
      this.delete(key);
      freedSize += this.estimateSize(entry);

      if (freedSize >= requiredSize) {
        break;
      }
    }
  }

  private getStorageKey(key: string): string {
    return `offline_cache_${key}`;
  }

  private saveToStorage(key: string, entry: CacheEntry): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(
        this.getStorageKey(key),
        JSON.stringify(entry)
      );
    } catch (error) {
      // Storage quota exceeded or other error
      console.warn('Failed to save to offline cache storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (!this.storage) return;

    const keys = Object.keys(this.storage);
    let loadedSize = 0;

    keys.forEach(key => {
      if (!key.startsWith('offline_cache_')) return;

      try {
        const stored = this.storage!.getItem(key);
        if (!stored) return;

        const entry: CacheEntry = JSON.parse(stored);
        const now = Date.now();

        // Only load if not expired
        if (now <= entry.expiresAt) {
          this.cache.set(key.replace('offline_cache_', ''), entry);
          loadedSize += this.estimateSize(entry);
        } else {
          // Clean up expired entry
          this.storage!.removeItem(key);
        }
      } catch (error) {
        console.warn('Failed to load offline cache entry:', error);
        this.storage!.removeItem(key);
      }
    });

    this.size = loadedSize;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.delete(key));

    if (this.storage) {
      this.loadFromStorage(); // Refresh from storage
    }
  }
}

// Create a singleton instance
export const offlineCache = new OfflineCache();

// Utility functions for common caching patterns
export const cacheUtils = {
  // Cache user profile data
  setProfile: (userId: string, profile: any) =>
    offlineCache.set(`profile_${userId}`, profile, { ttl: 60 * 60 * 1000 }), // 1 hour

  getProfile: (userId: string) =>
    offlineCache.get(`profile_${userId}`),

  // Cache messages
  setMessages: (conversationId: string, messages: any[]) =>
    offlineCache.set(`messages_${conversationId}`, messages, { ttl: 30 * 60 * 1000 }), // 30 minutes

  getMessages: (conversationId: string) =>
    offlineCache.get(`messages_${conversationId}`),

  // Cache search results
  setSearchResults: (query: string, results: any[]) =>
    offlineCache.set(`search_${query}`, results, { ttl: 10 * 60 * 1000 }), // 10 minutes

  getSearchResults: (query: string) =>
    offlineCache.get(`search_${query}`),

  // Cache images
  setImage: (url: string, imageData: string) =>
    offlineCache.set(`image_${url}`, imageData, { ttl: 7 * 24 * 60 * 60 * 1000 }), // 7 days

  getImage: (url: string) =>
    offlineCache.get(`image_${url}`),
};

// Hook for using offline cache in components
export function useOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: OfflineCacheOptions = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    const loadData = async () => {
      // Try to get from cache first
      const cached = offlineCache.get<T>(key);
      if (cached) {
        setData(cached);
      }

      // Then try to fetch fresh data
      try {
        setLoading(true);
        setError(null);
        const freshData = await fetcher();
        setData(freshData);
        offlineCache.set(key, freshData, options);
      } catch (err) {
        setError(err);
        // If we have cached data, keep showing it
        if (!cached) {
          throw err;
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, fetcher]);

  return { data, loading, error, refetch: () => fetcher() };
}

// React import for hooks
import React from "react";
