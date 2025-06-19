# API Endpoint Parity Documentation

This document ensures that the mobile app has complete API endpoint parity with the web application.

## ✅ Core Endpoints - Complete Parity

### Authentication & User Management
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/auth/login` | POST | Login placeholder (Clerk) | ✓ | ✓ |
| `/api/auth/register` | POST | Registration placeholder (Clerk) | ✓ | ✓ |
| `/api/profile` | GET | Get current user profile | ✓ | ✓ |
| `/api/profile` | PUT | Update user profile | ✓ | ✓ |
| `/api/profile` | POST | Create new profile | ✓ | ✓ |
| `/api/profile` | DELETE | Delete profile | ✓ | ✓ |
| `/api/user/me` | GET | Get current user info | ✓ | ✓ |

### Profile Management
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/profile-detail/{id}` | GET | Get profile details | ✓ | ✓ |
| `/api/profile-detail/{id}/images` | GET | Get profile images | ✓ | ✓ |
| `/api/profile/boost` | POST | Boost profile visibility | ✓ | ✓ |
| `/api/profile/view` | POST | Record profile view | ✓ | ✓ |
| `/api/profile/view` | GET | Get profile viewers | ✓ | ✓ |
| `/api/public-profile` | GET | Get public profile | ✓ | ✓ |

### Profile Images
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/profile-images/upload-url` | POST | Get image upload URL | ✓ | ✓ |
| `/api/profile-images` | POST | Save uploaded image | ✓ | ✓ |
| `/api/profile-images` | GET | Get profile images | ✓ | ✓ |
| `/api/profile-images/order` | PUT | Reorder images | ✓ | ✓ |
| `/api/profile-images/{id}` | DELETE | Delete image | ✓ | ✓ |
| `/api/profile-images/main` | PUT | Set main image | ✓ | ✓ |
| `/api/profile-images/batch` | POST | Batch operations | ✓ | ✓ |
| `/api/profile-images/confirm` | POST | Confirm upload | ✓ | ✓ |

### Search & Discovery
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/search` | GET | Search profiles | ✓ | ✓ |
| `/api/search-images` | GET | Search by images | ✓ | ✓ |

### Matching & Interests
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/interests` | POST | Send interest | ✓ | ✓ |
| `/api/interests` | DELETE | Remove interest | ✓ | ✓ |
| `/api/interests` | GET | Get interests | ✓ | ✓ |
| `/api/interests/sent` | GET | Get sent interests | ✓ | ✓ |
| `/api/interests/received` | GET | Get received interests | ✓ | ✓ |
| `/api/interests/respond` | POST | Respond to interest | ✓ | ✓ |
| `/api/interests/{id}/respond` | POST | Respond to specific interest | ✓ | ✓ |
| `/api/interests/status` | GET | Get interest status | ✓ | ✓ |

### Matches & Messaging
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/matches` | GET | Get user matches | ✓ | ✓ |
| `/api/matches/unread` | GET | Get unread counts | ✓ | ✓ |
| `/api/match-messages` | GET | Get match messages | ✓ | ✓ |
| `/api/match-messages` | POST | Send message | ✓ | ✓ |
| `/api/messages/read` | POST | Mark as read | ✓ | ✓ |
| `/api/messages/mark-read` | POST | Mark multiple as read | ✓ | ✓ |
| `/api/conversations/{id}/events` | GET | Get conversation events | ✓ | ✓ |
| `/api/conversations/{id}/mark-read` | POST | Mark conversation as read | ✓ | ✓ |

### Enhanced Messaging
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/typing-indicators` | POST | Send typing indicator | ✓ | ✓ |
| `/api/typing-indicators/{id}` | GET | Get typing indicators | ✓ | ✓ |
| `/api/delivery-receipts` | POST | Send delivery receipt | ✓ | ✓ |
| `/api/delivery-receipts/{id}` | GET | Get delivery receipts | ✓ | ✓ |
| `/api/voice-messages/upload` | POST | Upload voice message | ✓ | ✓ |
| `/api/voice-messages/{id}/url` | GET | Get voice message URL | ✓ | ✓ |

### Safety & Security
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/safety/report` | POST | Report user | ✓ | ✓ |
| `/api/safety/block` | POST | Block user | ✓ | ✓ |
| `/api/safety/unblock` | POST | Unblock user | ✓ | ✓ |
| `/api/safety/blocked` | GET | Get blocked users | ✓ | ✓ |
| `/api/safety/blocked/check` | GET | Check if blocked | ✓ | ✓ |

### Payments & Subscriptions
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/stripe/checkout` | POST | Create checkout session | ✓ | ✓ |
| `/api/stripe/webhook` | POST | Handle Stripe webhook | ✓ | N/A |
| `/api/subscription/status` | GET | Get subscription status | ✓ | ✓ |
| `/api/subscription/usage` | GET | Get usage stats | ✓ | ✓ |
| `/api/subscription/purchase` | POST | Purchase subscription | ✓ | ✓ |
| `/api/subscription/cancel` | POST | Cancel subscription | ✓ | ✓ |
| `/api/subscription/restore` | POST | Restore purchases | ✓ | ✓ |
| `/api/subscription/upgrade` | POST | Upgrade tier | ✓ | ✓ |
| `/api/subscription/track-usage` | POST | Track feature usage | ✓ | ✓ |

### Blog & Content
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/blog` | GET | List blog posts | ✓ | ✓ |
| `/api/blog` | POST | Create blog post | ✓ | ✓ |
| `/api/blog` | DELETE | Delete blog post | ✓ | ✓ |
| `/api/blog/{slug}` | GET | Get blog post | ✓ | ✓ |
| `/api/images/blog` | GET | Get blog images | ✓ | ✓ |

### Contact & Support
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/contact` | POST | Submit contact form | ✓ | ✓ |
| `/api/contact` | GET | Get submissions (admin) | ✓ | ✓ |

### AI & Chat
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/gemini-chat` | POST | AI chat assistant | ✓ | ✓ |
| `/api/saveChatbotMessage` | POST | Save chat message | ✓ | ✓ |
| `/api/convert-ai-text-to-html` | POST | Convert text to HTML | ✓ | ✓ |

### Push Notifications
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/push/register` | POST | Register device | ✓ | ✓ |

## ✅ Admin Endpoints - Complete Parity

### Admin Profile Management
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/admin/profiles` | GET | List all profiles | ✓ | ✓ |
| `/api/admin/profiles` | PUT | Update any profile | ✓ | ✓ |
| `/api/admin/profiles` | DELETE | Delete any profile | ✓ | ✓ |
| `/api/admin/profiles/{id}` | GET | Get specific profile | ✓ | ✓ |
| `/api/admin/profiles/{id}` | PUT | Update specific profile | ✓ | ✓ |
| `/api/admin/profiles/{id}/ban` | POST | Ban user | ✓ | ✓ |
| `/api/admin/profiles/{id}/spotlight` | POST | Toggle spotlight | ✓ | ✓ |
| `/api/admin/profiles/{id}/images/order` | PUT | Reorder user images | ✓ | ✓ |
| `/api/admin/profiles/{id}/matches` | GET | Get user matches | ✓ | ✓ |

### Admin Match & Interest Management
| Endpoint | Method | Purpose | Web ✓ | Mobile ✓ |
|----------|--------|---------|-------|-----------|
| `/api/admin/matches` | GET | List all matches | ✓ | ✓ |
| `/api/admin/matches/create` | POST | Create match | ✓ | ✓ |
| `/api/admin/interests` | GET | List all interests | ✓ | ✓ |

## 📱 Mobile-Specific Enhancements

### Enhanced Error Handling
- **Enhanced API Client**: Automatic retry, offline queueing, prioritized requests
- **Network Manager**: Advanced network state handling
- **Error Reporter**: Comprehensive error tracking with breadcrumbs
- **Security Integration**: Request monitoring and threat detection

### Security Features
- **Request Priority**: High/Medium/Low priority queuing
- **Offline Support**: Automatic request queueing when offline
- **Authentication**: Seamless Clerk integration with token refresh
- **Error Classification**: Smart error categorization and handling

## 🔄 API Client Architecture

### Basic API Client (`api.ts`)
- Simple, lightweight client for basic operations
- Standard error handling
- All core endpoints implemented

### Enhanced API Client (`enhancedApiClient.ts`)
- Advanced features: retry logic, offline queueing, priority handling
- Security integration with error reporting
- Performance optimization with network management
- All endpoints with enhanced capabilities

## 🧪 Testing & Validation

### Endpoint Testing Checklist
- [ ] Authentication headers properly attached
- [ ] Request/response parsing correct
- [ ] Error handling works as expected
- [ ] Retry logic functions properly
- [ ] Offline queueing works
- [ ] Priority handling effective

### Integration Testing
- [ ] Web and mobile API calls return same data structure
- [ ] All CRUD operations work identically
- [ ] Error responses match between platforms
- [ ] Authentication flow identical
- [ ] Rate limiting respected

## 🚀 Usage Examples

### Enhanced API Client
```typescript
import { useEnhancedApiClient } from '../utils/enhancedApiClient';

const Component = () => {
  const api = useEnhancedApiClient();
  
  // High priority request with retry
  const result = await api.sendInterest(toUserId, fromUserId);
  
  // Offline-safe request
  const profile = await api.getProfile();
};
```

### Basic API Client
```typescript
import { useApiClient } from '../utils/api';

const Component = () => {
  const api = useApiClient();
  
  // Standard request
  const result = await api.searchProfiles(filters);
};
```

## 📊 Performance Considerations

### Request Optimization
- **Priority Queuing**: Critical requests processed first
- **Automatic Retry**: Smart retry with exponential backoff
- **Offline Queueing**: Requests saved and sent when online
- **Error Recovery**: Graceful degradation on failures

### Security Monitoring
- **Request Tracking**: All API calls monitored for security
- **Error Classification**: Automatic threat detection
- **Breadcrumb Logging**: Detailed request history for debugging
- **Privacy Protection**: No sensitive data in error reports

## ✅ Completion Status

**100% API Endpoint Parity Achieved**

- ✅ All 80+ web endpoints implemented in mobile
- ✅ Enhanced error handling and security
- ✅ Offline support and request queueing
- ✅ Admin endpoints fully supported
- ✅ Voice messages and advanced features
- ✅ AI chat and blog functionality
- ✅ Complete subscription management
- ✅ Comprehensive safety features

The mobile app now has complete feature parity with the web application, plus additional mobile-specific enhancements for security, offline functionality, and performance optimization.