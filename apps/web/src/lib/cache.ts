import { LRUCache } from 'lru-cache';

// Create a new LRU cache with a maximum of 1000 entries
// Each entry will expire after 1 hour (3600000 ms)
const profileCache = new LRUCache<string, boolean>({
  max: 1000,
  ttl: 3600000, // 1 hour in milliseconds
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

export const getCachedProfileComplete = (userId: string): boolean | undefined => {
  return profileCache.get(userId);
};

export const setCachedProfileComplete = (userId: string, isComplete: boolean): void => {
  profileCache.set(userId, isComplete);
};

export const clearCachedProfileComplete = (userId: string): void => {
  profileCache.delete(userId);
};
