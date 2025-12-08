# Offline/Online Functionality - Complete Solution

This document outlines the comprehensive offline/online functionality improvements implemented for the Aroosi Next.js application.

## 🎯 Overview

The offline/online functionality has been completely overhauled to provide:

- **Advanced Network Detection**: Beyond basic `navigator.onLine`
- **Global Offline Banner**: Prominent UI indicators for connection status
- **Smart Retry Mechanisms**: Intelligent retry strategies based on network conditions
- **Offline Data Caching**: Persistent storage for critical data
- **Connection Quality Assessment**: Real-time network performance monitoring
- **Standardized UX**: Consistent offline states across all components

## 🚀 Key Improvements

### 1. Enhanced Network Detection (`useOffline` hook)

**Location**: `/src/hooks/useOffline.ts`

#### Features:
- **Real-time latency measurement** using fetch requests
- **Connection quality assessment** (excellent, good, slow, poor, offline)
- **Network condition awareness** (slow connections, intermittent connectivity)
- **Periodic quality checks** every 30 seconds
- **Visibility change detection** for tab focus events

#### Usage:
```typescript
const networkStatus = useOffline();

// Access detailed network information
console.log({
  isOnline: networkStatus.isOnline,        // boolean
  quality: networkStatus.quality,          // "excellent" | "good" | "slow" | "poor" | "offline"
  isSlowConnection: networkStatus.isSlowConnection, // boolean
  latency: networkStatus.latency,          // number (ms)
  lastOnline: networkStatus.lastOnline,    // timestamp
});
```

### 2. Global Offline Banner Component

**Location**: `/src/components/ui/offline-banner.tsx`

#### Features:
- **Multiple variants**: banner, toast, compact
- **Smart messaging** based on connection quality
- **Dismissible option** for non-critical states
- **Retry functionality** with network-aware buttons
- **Real-time updates** as network conditions change

#### Usage:
```typescript
import { OfflineBanner, ConnectionIndicator } from "@/components/ui/offline-banner";

// Global banner (added to ClientRoot)
<OfflineBanner variant="banner" dismissible={false} />

// Compact indicator for headers
<ConnectionIndicator size="sm" showLabel={true} />

// Toast-style notification
<OfflineBanner variant="toast" onRetry={() => refetchData()} />
```

### 3. Smart Retry Mechanisms

**Location**: `/src/hooks/useSmartRetry.ts`

#### Features:
- **Exponential backoff** with jitter to prevent thundering herd
- **Network-aware delays** (longer delays for poor connections)
- **Intelligent retry conditions** based on error types and network status
- **Abort controller support** for request cancellation
- **Retry state tracking** with detailed attempt information

#### Usage:
```typescript
const { retry, isRetrying, attempt, canRetry } = useSmartRetry({
  maxAttempts: 3,
  baseDelay: 1000,
  onRetry: (attempt, error) => console.log(`Retry attempt ${attempt}`),
});

try {
  const data = await retry(() => fetch('/api/data'));
} catch (error) {
  console.log('Max attempts reached:', error);
}
```

### 4. Offline Data Caching System

**Location**: `/src/lib/offline-cache.ts`

#### Features:
- **LocalStorage persistence** across browser sessions
- **TTL (Time To Live)** for cache entries
- **Size management** with LRU eviction
- **Version control** for cache invalidation
- **Automatic cleanup** of expired entries

#### Usage:
```typescript
import { offlineCache, cacheUtils } from "@/lib/offline-cache";

// Direct cache usage
offlineCache.set('user_profile', profileData, { ttl: 60 * 60 * 1000 });
const cachedProfile = offlineCache.get('user_profile');

// Utility functions for common patterns
cacheUtils.setProfile(userId, profileData);
const profile = cacheUtils.getProfile(userId);

// Hook for React components
const { data, loading, error } = useOfflineCache(
  'user_profile',
  () => fetchUserProfile(),
  { ttl: 30 * 60 * 1000 }
);
```

### 5. Enhanced Error States

**Location**: `/src/components/ui/error-state.tsx`

#### Features:
- **Network-aware messaging** with specific icons for different connection states
- **Latency display** for connection quality feedback
- **Smart retry buttons** that adapt to network conditions
- **Multiple variants** for different UI contexts

#### Usage:
```typescript
import { ErrorState, NetworkErrorState } from "@/components/ui/error-state";

// Enhanced error state
<ErrorState
  message="Failed to load data"
  onRetry={() => refetch()}
  variant="compact"
  showRetryButton={true}
/>

// Network-specific error state
<NetworkErrorState
  onRetry={() => retryRequest()}
  showQuality={true}
/>
```

## 📍 Integration Points

### 1. ClientRoot Integration

The global offline banner has been integrated into `ClientRoot.tsx` to show connection status across the entire application.

### 2. Header Integration

Connection quality indicator added to the header navigation for always-visible status information.

### 3. Updated Components

- **Error states** now use enhanced offline detection
- **Chat components** show connection quality for real-time messaging
- **API calls** can leverage smart retry mechanisms
- **Data fetching** supports offline caching

## 🎨 UI/UX Improvements

### 1. Visual Indicators

- **Color-coded connection status**: Green (good), Yellow (slow), Red (offline)
- **Animated indicators** with pulse effects for active connections
- **Contextual icons** that change based on connection quality
- **Progress indicators** for retry operations

### 2. User Feedback

- **Clear messaging** about connection status and expected behavior
- **Actionable retry buttons** with smart labeling
- **Dismissible notifications** for non-critical states
- **Latency information** for transparency

### 3. Accessibility

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus management** for modal states
- **High contrast** support for visibility

## 🔧 Configuration Options

### Network Detection Settings

```typescript
const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: 50,   // ms
  good: 200,       // ms
  slow: 1000,      // ms
  poor: 3000,      // ms
};
```

### Cache Configuration

```typescript
const cacheOptions: OfflineCacheOptions = {
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 50,              // 50MB
  version: '1.0',
  persist: true,
};
```

### Retry Configuration

```typescript
const retryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
};
```

## 📱 Mobile Considerations

- **Touch-friendly** button sizing
- **Swipe gestures** for dismissing banners
- **Reduced animations** on mobile for performance
- **Battery-aware** polling intervals

## 🧪 Testing

### Manual Testing
1. **Simulate offline**: Use browser dev tools network throttling
2. **Test slow connections**: Use network throttling presets
3. **Test data persistence**: Refresh page while offline
4. **Test retry mechanisms**: Block/unblock network during requests

### Automated Testing
```typescript
// Example test for offline functionality
describe('Offline functionality', () => {
  it('should show offline banner when connection lost', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false });
    // Trigger offline event
    window.dispatchEvent(new Event('offline'));
    // Assert banner visibility
    expect(getByText('You are offline')).toBeInTheDocument();
  });
});
```

## 🔒 Security Considerations

- **No sensitive data** cached in offline storage
- **Cache encryption** for sensitive information (if needed)
- **Cache invalidation** on security updates
- **Size limits** to prevent storage abuse

## 📈 Performance Impact

- **Minimal overhead** for network detection (30-second intervals)
- **Efficient caching** with automatic cleanup
- **Lazy loading** of retry mechanisms
- **Memory management** with size limits and eviction

## 🚀 Future Enhancements

### Planned Features
1. **Service Worker** integration for better offline support
2. **Background sync** for queued actions when offline
3. **Progressive Web App** features
4. **Network prediction** based on user behavior

### Advanced Caching
1. **Database integration** with IndexedDB
2. **Image optimization** for offline viewing
3. **Video/audio caching** for media content
4. **Dynamic cache strategies** based on content type

## 📞 Support

For issues or questions about the offline functionality:

1. **Check the browser console** for network-related errors
2. **Verify network connectivity** and browser settings
3. **Test in incognito mode** to rule out extension interference
4. **Review the documentation** for configuration options

## 🎉 Conclusion

The offline/online functionality has been completely transformed with:

- ✅ **Robust network detection** beyond basic browser APIs
- ✅ **Global UI indicators** for connection status
- ✅ **Smart retry mechanisms** with network awareness
- ✅ **Offline data persistence** for critical information
- ✅ **Consistent UX** across all components
- ✅ **Performance optimization** and accessibility
- ✅ **Comprehensive documentation** and testing guidance

Users will now have a seamless experience regardless of their network conditions, with intelligent fallbacks and clear feedback about connection status.
