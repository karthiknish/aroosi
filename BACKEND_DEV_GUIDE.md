# Backend Development Guide - APIs, Helpers & Utils

This document provides comprehensive guidance for working with the backend architecture, APIs, helpers, and utilities in the Aroosi project.

## Table of Contents
- [Project Architecture](#project-architecture)
- [API Development Patterns](#api-development-patterns)
- [Authentication & Authorization](#authentication--authorization)
- [Database Layer (Convex)](#database-layer-convex)
- [Helper Functions](#helper-functions)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)
- [Security & Rate Limiting](#security--rate-limiting)
- [Testing Patterns](#testing-patterns)
- [Examples](#examples)

## Project Architecture

### File Structure
```
apps/web/src/
├── app/api/                    # API routes (App Router)
│   ├── _utils/                 # Shared API utilities
│   │   └── auth.ts            # Authentication helpers
│   ├── profile/route.ts       # Profile CRUD operations
│   ├── safety/               # Safety-related endpoints
│   └── subscription/         # Subscription endpoints
├── lib/
│   ├── convexClient.ts       # Convex client setup
│   ├── apiResponse.ts        # Response helpers
│   └── utils/
│       ├── securityHeaders.ts # Security utilities
│       ├── apiResponse.ts    # API response formatting
│       └── profileValidation.ts # Validation helpers
└── types/                    # TypeScript type definitions
```

## API Development Patterns

### 1. Standard API Route Structure

```typescript
import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // 2. Rate limiting
    const rateLimitResult = checkApiRateLimit(`operation_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // 3. Input validation
    const body = await request.json();
    // ... validate inputs

    // 4. Database operations
    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    client.setAuth(token);
    const result = await client.mutation(api.namespace.operation, {
      // ... parameters
    });

    // 5. Success response
    return successResponse(result);

  } catch (error) {
    console.error("Error in API:", error);
    return errorResponse("Operation failed", 500);
  }
}
```

### 2. HTTP Methods by Operation Type

| Operation | Method | Usage |
|-----------|--------|-------|
| `GET` | Read data | Fetch user profiles, lists, status checks |
| `POST` | Create/Action | Create profiles, send messages, trigger actions |
| `PUT` | Update | Update existing profiles, settings |
| `DELETE` | Remove | Delete profiles, remove blocks |
| `PATCH` | Partial Update | Update specific fields |

## Authentication & Authorization

### Primary Auth Helper: `requireUserToken()`

**Location**: `/apps/web/src/app/api/_utils/auth.ts`

```typescript
// Usage in API routes
const authCheck = requireUserToken(request);
if ("errorResponse" in authCheck) return authCheck.errorResponse;
const { token, userId } = authCheck;
```

**Returns:**
- Success: `{ token: string, userId: string }`
- Failure: `{ errorResponse: NextResponse }`

### Authentication Flow
1. Extract JWT token from Authorization header
2. Validate token with Clerk
3. Extract user ID from token
4. Return user context for API operations

### Authorization Patterns
```typescript
// Role-based access
const { isAdmin, isModerator } = await getUserRoles(userId);
if (!isAdmin) {
  return errorResponse("Insufficient permissions", 403);
}

// Resource ownership
const resource = await client.query(api.resources.getById, { id });
if (resource.ownerId !== userId) {
  return errorResponse("Access denied", 403);
}
```

## Database Layer (Convex)

### Convex Client Setup

**Primary Helper**: `getConvexClient()`
**Location**: `/apps/web/src/lib/convexClient.ts`

```typescript
// Standard usage pattern
let client = convexClient; // Global instance
if (!client) {
  client = getConvexClient(); // Fallback creation
}

if (!client) {
  return errorResponse("Database connection failed", 500);
}

client.setAuth(token); // Set user context
```

### Database Operations

#### Queries (Read Operations)
```typescript
// Single record
const user = await client.query(api.users.getById, { userId });

// List with filters
const profiles = await client.query(api.profiles.search, {
  city: "London",
  ageMin: 25,
  ageMax: 35
});

// Paginated results
const results = await client.query(api.profiles.paginated, {
  page: 0,
  pageSize: 20,
  filters: { ... }
});
```

#### Mutations (Write Operations)
```typescript
// Create
const newProfile = await client.mutation(api.profiles.create, {
  userId,
  fullName: "John Doe",
  // ... other fields
});

// Update
const updated = await client.mutation(api.profiles.update, {
  profileId,
  updates: { city: "Manchester" }
});

// Delete
await client.mutation(api.profiles.delete, { profileId });
```

### Convex Schema Patterns

#### Table Relationships
```typescript
// One-to-One (User -> Profile)
users: { _id, clerkId, email, role }
profiles: { _id, userId, fullName, ... }

// One-to-Many (Profile -> Images)
profiles: { _id, userId, ... }
images: { _id, profileId, url, order }

// Many-to-Many (User -> Blocked Users)
blocks: { _id, blockerId, blockedUserId, createdAt }
```

## Helper Functions

### 1. Response Helpers

**Location**: `/apps/web/src/lib/apiResponse.ts`

```typescript
// Success responses
return successResponse(data);
return successResponse(data, 201); // Custom status code

// Error responses
return errorResponse("Error message", 400);
return errorResponse("Not found", 404);
return errorResponse("Server error", 500);
```

**Response Format:**
```json
{
  "success": true|false,
  "data": {...},       // On success
  "error": "message",  // On error
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 2. Validation Helpers

**Location**: `/apps/web/src/lib/utils/profileValidation.ts`

```typescript
// Profile data validation
const validationResult = validateProfileData(profileData);
if (!validationResult.isValid) {
  return errorResponse(validationResult.errors.join(", "), 400);
}

// Input sanitization
const sanitized = sanitizeProfileInput(rawInput);
```

### 3. Security Helpers

**Location**: `/apps/web/src/lib/utils/securityHeaders.ts`

```typescript
// Rate limiting
const rateLimitResult = checkApiRateLimit(
  `operation_${userId}`,  // Unique key
  50,                     // Max requests
  60000                   // Time window (ms)
);

if (!rateLimitResult.allowed) {
  return errorResponse("Rate limit exceeded", 429);
}

// Security event logging
logSecurityEvent("suspicious_activity", {
  userId,
  action: "multiple_failed_logins",
  metadata: { ip, userAgent }
});
```

## Utility Functions

### 1. Data Transformation

```typescript
// Image URL processing
const processedImages = images.map(img => ({
  ...img,
  url: optimizeImageUrl(img.url),
  thumbnail: generateThumbnailUrl(img.url)
}));

// Profile completion calculation
const completionPercentage = calculateProfileCompletion(profile);

// Age calculation from date of birth
const age = calculateAge(profile.dateOfBirth);
```

### 2. Search & Filtering

```typescript
// Search query building
const searchFilters = buildSearchFilters({
  city: "London",
  ageRange: [25, 35],
  education: "University"
});

// Result pagination
const paginatedResults = paginateResults(allResults, page, pageSize);
```

### 3. Business Logic Helpers

```typescript
// Subscription checks
const hasFeatureAccess = checkSubscriptionFeature(userPlan, "advanced_search");

// Compatibility scoring
const compatibilityScore = calculateCompatibility(user1Profile, user2Profile);

// Notification helpers
await sendNotification(userId, "new_message", {
  fromUser: senderName,
  preview: messagePreview
});
```

## Error Handling

### Error Response Standards

```typescript
// Standard error format
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE", // Optional
  "details": {...},     // Optional additional context
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Categories

| Status Code | Category | Examples |
|-------------|----------|----------|
| `400` | Bad Request | Invalid input, missing fields |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource |
| `429` | Rate Limited | Too many requests |
| `500` | Server Error | Database errors, unexpected failures |

### Error Handling Patterns

```typescript
try {
  // API operation
} catch (error) {
  // Log error for debugging
  console.error("API Error:", error);
  
  // Return user-friendly error
  if (error.message.includes("not found")) {
    return errorResponse("Resource not found", 404);
  }
  
  if (error.message.includes("duplicate")) {
    return errorResponse("Resource already exists", 409);
  }
  
  // Generic server error
  return errorResponse("Operation failed", 500);
}
```

## Security & Rate Limiting

### Rate Limiting Guidelines

| Operation Type | Limit | Window | Key Pattern |
|----------------|-------|--------|-------------|
| Authentication | 5 attempts | 15 minutes | `auth_${ip}` |
| Profile Updates | 10 requests | 1 minute | `profile_update_${userId}` |
| Search Queries | 100 requests | 1 minute | `search_${userId}` |
| Message Sending | 20 messages | 1 minute | `message_${userId}` |
| Safety Reports | 10 reports | 1 minute | `safety_report_${userId}` |
| Image Uploads | 5 uploads | 1 minute | `upload_${userId}` |

### Security Best Practices

```typescript
// Input validation
const sanitizedInput = sanitizeUserInput(rawInput);
validateInputAgainstSchema(sanitizedInput, expectedSchema);

// SQL injection prevention (Convex handles this automatically)
// XSS prevention
const safeContent = escapeHtml(userContent);

// Sensitive data handling
// Never log sensitive data
console.log("User action", { userId, action, ip }); // ✅ Good
console.log("Login attempt", { password, email }); // ❌ Bad

// API key/token security
const token = request.headers.get("authorization")?.replace("Bearer ", "");
// Never expose tokens in responses
```

## Testing Patterns

### API Route Testing

```typescript
// Mock setup
jest.mock('@/lib/convexClient');
jest.mock('@/app/api/_utils/auth');

const mockConvexClient = getConvexClient as jest.MockedFunction<typeof getConvexClient>;
const mockRequireUserToken = requireUserToken as jest.MockedFunction<typeof requireUserToken>;

// Test structure
describe('/api/endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successful operation', async () => {
    // Setup mocks
    mockRequireUserToken.mockReturnValue({
      token: 'valid-token',
      userId: 'user-123'
    });

    const mockClient = {
      mutation: jest.fn().mockResolvedValue({ success: true }),
      setAuth: jest.fn()
    };
    mockConvexClient.mockReturnValue(mockClient);

    // Execute request
    const request = new NextRequest('http://localhost/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    });

    const response = await POST(request);
    
    // Assertions
    expect(response.status).toBe(200);
    expect(mockClient.mutation).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ data: 'test' })
    );
  });

  test('unauthorized request', async () => {
    mockRequireUserToken.mockReturnValue({
      errorResponse: new NextResponse('Unauthorized', { status: 401 })
    });

    const request = new NextRequest('http://localhost/api/endpoint', {
      method: 'POST'
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

## Examples

### Complete API Route Example

```typescript
// /apps/web/src/app/api/profile/interests/route.ts
import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`send_interest_${userId}`, 20, 60000);
    if (!rateLimitResult.allowed) {
      return errorResponse("Too many interest requests. Please wait.", 429);
    }

    // Input validation
    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return errorResponse("Target user ID is required", 400);
    }

    if (targetUserId === userId) {
      return errorResponse("Cannot send interest to yourself", 400);
    }

    // Database operations
    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    client.setAuth(token);

    // Check if interest already exists
    const existingInterest = await client.query(api.interests.findExisting, {
      fromUserId: userId,
      toUserId: targetUserId
    });

    if (existingInterest) {
      return errorResponse("Interest already sent to this user", 409);
    }

    // Send interest
    const interest = await client.mutation(api.interests.send, {
      fromUserId: userId,
      toUserId: targetUserId
    });

    // Send notification
    await client.mutation(api.notifications.create, {
      userId: targetUserId,
      type: "new_interest",
      metadata: { fromUserId: userId }
    });

    return successResponse({
      message: "Interest sent successfully",
      interestId: interest
    });

  } catch (error) {
    console.error("Error sending interest:", error);
    return errorResponse("Failed to send interest", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    const rateLimitResult = checkApiRateLimit(`get_interests_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    client.setAuth(token);

    // Get user's sent and received interests
    const [sentInterests, receivedInterests] = await Promise.all([
      client.query(api.interests.getSent, { userId }),
      client.query(api.interests.getReceived, { userId })
    ]);

    return successResponse({
      sent: sentInterests,
      received: receivedInterests
    });

  } catch (error) {
    console.error("Error fetching interests:", error);
    return errorResponse("Failed to fetch interests", 500);
  }
}
```

### Helper Function Example

```typescript
// /apps/web/src/lib/utils/profileHelpers.ts
export function calculateProfileCompletion(profile: Profile): number {
  const requiredFields = [
    'fullName', 'dateOfBirth', 'ukCity', 'education', 
    'occupation', 'aboutMe'
  ];
  
  const optionalFields = [
    'height', 'relationshipStatus', 'hasChildren'
  ];

  const completedRequired = requiredFields.filter(
    field => profile[field] && profile[field].trim().length > 0
  ).length;

  const completedOptional = optionalFields.filter(
    field => profile[field] !== null && profile[field] !== undefined
  ).length;

  // Required fields worth 80%, optional fields worth 20%
  const requiredScore = (completedRequired / requiredFields.length) * 80;
  const optionalScore = (completedOptional / optionalFields.length) * 20;

  return Math.round(requiredScore + optionalScore);
}

export function validateProfileUpdate(updates: Partial<Profile>): ValidationResult {
  const errors: string[] = [];

  if (updates.fullName && updates.fullName.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  if (updates.dateOfBirth) {
    const age = calculateAge(updates.dateOfBirth);
    if (age < 18 || age > 100) {
      errors.push("Age must be between 18 and 100");
    }
  }

  if (updates.aboutMe && updates.aboutMe.length > 500) {
    errors.push("About me section must be less than 500 characters");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Message API Implementation Examples

The message APIs have been updated to follow the established patterns. Here are the key implementations:

### 1. Text Messages (`/api/match-messages`)

```typescript
// GET: Fetch messages with pagination
const authCheck = requireUserToken(request);
const rateLimitResult = checkApiRateLimit(`get_messages_${userId}`, 100, 60000);

// Verify user is part of conversation
const userIds = conversationId.split('_');
if (!userIds.includes(userId)) {
  return errorResponse("Unauthorized access to conversation", 403);
}

const result = await client.query(api.messages.getMessages, {
  conversationId,
  limit,
  before,
});
```

```typescript
// POST: Send message with safety checks
const validation = validateMessagePayload({ conversationId, fromUserId, toUserId, text });

// Check if users are blocked
const blockStatus = await client.query(api.safety.checkBlockStatus, {
  userId: fromUserId,
  targetUserId: toUserId,
});

if (blockStatus?.isBlocked || blockStatus?.isBlockedBy) {
  return errorResponse("Cannot send message to this user", 403);
}

// Send message and broadcast
const result = await client.mutation(api.messages.sendMessage, { ... });
eventBus.emit(conversationId, result);
```

### 2. Voice Messages (`/api/voice-messages/upload`)

```typescript
// File upload with validation
const audioFile = formData.get('audio') as File;

// Validate file type and size
if (!audioFile.type.startsWith('audio/')) {
  return errorResponse("Invalid file type. Must be audio.", 400);
}

// Check premium subscription
const canSendVoice = await client.query(api.subscription.checkFeatureAccess, {
  userId,
  feature: "voice_messages"
});

// Upload to Convex storage
const blob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
const storageId = await client.mutation(api.files.generateUploadUrl);
```

### 3. Message Status (`/api/messages/mark-read`)

```typescript
// Bulk mark as read with validation
if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
  return errorResponse("Invalid or empty messageIds array", 400);
}

// Prevent abuse
if (messageIds.length > 100) {
  return errorResponse("Cannot mark more than 100 messages as read at once", 400);
}

const result = await client.mutation(api.messages.markMessagesAsRead, {
  messageIds,
  userId,
  readAt: Date.now()
});
```

### Key Message API Patterns

| Feature | Rate Limit | Special Validations |
|---------|------------|-------------------|
| Get Messages | 100/min | Conversation membership |
| Send Messages | 20/min | Block status, message validation |
| Voice Upload | 10/min | Premium subscription, file validation |
| Mark Read | 50/min | Bulk operation limits |

### Message Validation Helpers

```typescript
// Message content validation
const validation = validateMessagePayload({
  conversationId,
  fromUserId,
  toUserId,
  text
});

// Conversation ID format validation
if (!validateConversationId(conversationId)) {
  return errorResponse("Invalid conversationId format", 400);
}

// User permission validation
const canMessage = await validateUserCanMessage(fromUserId, toUserId);
if (!canMessage) {
  return errorResponse("Users are not authorized to message each other", 403);
}
```

### Safety Integration

All message APIs now include:
- Block status checking before sending
- Safety validation for user interactions
- Premium feature access control
- File upload security for voice messages

## Quick Reference Commands

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test

# Run API tests specifically
npm run test -- --testPathPattern=api

# Start development server
npm run dev

# Build for production
npm run build
```

---

**Note**: This guide should be referenced whenever implementing new API endpoints, updating existing ones, or working with the backend infrastructure. Always follow these patterns for consistency and maintainability.