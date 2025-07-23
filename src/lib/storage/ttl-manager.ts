/**
 * TTL (Time-to-Live) Manager for localStorage profile data
 * Automatically purges stale data and refreshes TTL on access
 */

interface TTLData<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface TTLManagerOptions {
  defaultTTL?: number; // milliseconds
  checkInterval?: number; // milliseconds
}

class TTLManager {
  private readonly defaultTTL: number;
  private readonly checkInterval: number;
  private readonly prefix: string = "ttl_";
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: TTLManagerOptions = {}) {
    this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.checkInterval = options.checkInterval || 60 * 60 * 1000; // 1 hour
    this.startCleanupInterval();
  }

  /**
   * Set a value with TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const data: TTLData<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  /**
   * Get a value and refresh TTL if still valid
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const data: TTLData<T> = JSON.parse(item);

      // Check if expired
      if (Date.now() - data.timestamp > data.ttl) {
        this.remove(key);
        return null;
      }

      // Refresh TTL on access
      data.timestamp = Date.now();
      localStorage.setItem(this.prefix + key, JSON.stringify(data));

      return data.value;
    } catch (error) {
      console.error("Failed to read from localStorage:", error);
      return null;
    }
  }

  /**
   * Remove a key
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error("Failed to remove from localStorage:", error);
    }
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get remaining TTL for a key
   */
  getRemainingTTL(key: string): number {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return 0;

      const data: TTLData<unknown> = JSON.parse(item);
      const remaining = data.ttl - (Date.now() - data.timestamp);
      return Math.max(0, remaining);
    } catch (error) {
      console.error("Failed to calculate remaining TTL:", error);
      return 0;
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const data: TTLData<unknown> = JSON.parse(item);
            if (Date.now() - data.timestamp > data.ttl) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error("Failed to parse TTL data during cleanup:", error);
            localStorage.removeItem(key);
          }
        }
      }
    }
  }

  /**
   * Get all valid keys
   */
  keys(): string[] {
    const keys: string[] = [];
    const prefix = this.prefix;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const data: TTLData<unknown> = JSON.parse(item);
            if (Date.now() - data.timestamp <= data.ttl) {
              keys.push(key.substring(prefix.length));
            }
          } catch (error) {
            console.error("Failed to parse TTL data:", error);
            localStorage.removeItem(key);
          }
        }
      }
    }

    return keys;
  }

  /**
   * Clear all TTL data
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.checkInterval);
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get TTL manager instance for profile data
   */
  static getProfileTTLManager(): TTLManager {
    return new TTLManager({
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      checkInterval: 60 * 60 * 1000, // 1 hour
    });
  }
}

// Export singleton instance
export const profileTTLManager = TTLManager.getProfileTTLManager();

// Hook for React components
export const useTTLStorage = () => {
  return profileTTLManager;
};

// Utility functions for direct usage
export const ttlStorage = {
  set: <T>(key: string, value: T, ttl?: number) =>
    profileTTLManager.set(key, value, ttl),
  get: <T>(key: string): T | null => profileTTLManager.get<T>(key),
  remove: (key: string) => profileTTLManager.remove(key),
  has: (key: string) => profileTTLManager.has(key),
  getRemainingTTL: (key: string) => profileTTLManager.getRemainingTTL(key),
  cleanup: () => profileTTLManager.cleanup(),
  clear: () => profileTTLManager.clear(),
  keys: () => profileTTLManager.keys(),
};
