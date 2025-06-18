import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  SEARCH_FILTERS: 'search_filters',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  NOTIFICATION_SETTINGS: 'notification_settings',
  THEME_PREFERENCE: 'theme_preference',
  LAST_ACTIVE: 'last_active',
} as const;

// Secure storage for sensitive data
export const secureStorage = {
  async set(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await SecureStore.setItemAsync(key, jsonValue);
    } catch (error) {
      console.error('Error saving to secure storage:', error);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await SecureStore.getItemAsync(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing from secure storage:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  },
};

// User preferences
export interface UserPreferences {
  notifications: {
    matches: boolean;
    messages: boolean;
    interests: boolean;
    marketing: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showDistance: boolean;
    allowProfileViewing: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    showAge: boolean;
    measurementUnit: 'metric' | 'imperial';
  };
}

export const userPreferences = {
  async save(preferences: UserPreferences): Promise<void> {
    await secureStorage.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  async load(): Promise<UserPreferences | null> {
    return await secureStorage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);
  },

  async getDefault(): Promise<UserPreferences> {
    return {
      notifications: {
        matches: true,
        messages: true,
        interests: true,
        marketing: false,
      },
      privacy: {
        showOnlineStatus: true,
        showDistance: true,
        allowProfileViewing: true,
      },
      display: {
        theme: 'system',
        showAge: true,
        measurementUnit: 'metric',
      },
    };
  },
};

// Search filters persistence
export interface SearchFilters {
  ageMin?: number;
  ageMax?: number;
  city?: string;
  preferredGender?: 'male' | 'female' | 'other' | 'any';
  maxDistance?: number;
  religion?: string;
  education?: string;
  occupation?: string;
}

export const searchFilters = {
  async save(filters: SearchFilters): Promise<void> {
    await secureStorage.set(STORAGE_KEYS.SEARCH_FILTERS, filters);
  },

  async load(): Promise<SearchFilters | null> {
    return await secureStorage.get<SearchFilters>(STORAGE_KEYS.SEARCH_FILTERS);
  },

  async clear(): Promise<void> {
    await secureStorage.remove(STORAGE_KEYS.SEARCH_FILTERS);
  },
};

// Onboarding status
export const onboarding = {
  async markComplete(): Promise<void> {
    await secureStorage.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
  },

  async isComplete(): Promise<boolean> {
    const complete = await secureStorage.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return complete === true;
  },

  async reset(): Promise<void> {
    await secureStorage.remove(STORAGE_KEYS.ONBOARDING_COMPLETE);
  },
};

// Last active tracking
export const activity = {
  async updateLastActive(): Promise<void> {
    await secureStorage.set(STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());
  },

  async getLastActive(): Promise<Date | null> {
    const lastActive = await secureStorage.get<string>(STORAGE_KEYS.LAST_ACTIVE);
    return lastActive ? new Date(lastActive) : null;
  },
};

export { STORAGE_KEYS };