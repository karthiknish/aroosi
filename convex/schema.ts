import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk user ID, generally a string like "user_xxxxxxxxxxxxxx"
    clerkId: v.string(),
    email: v.string(),
    banned: v.optional(v.boolean()),
    role: v.optional(v.string()),
    // We might not need to store username if Clerk handles it and we can derive it
    // username: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  profiles: defineTable({
    userId: v.id("users"), // This will now link to the user record identified by Clerk ID
    clerkId: v.string(), // For easier linking from Clerk data if needed directly in profile queries
    profileFor: v.optional(
      v.union(v.literal("self"), v.literal("friend"), v.literal("family"))
    ),
    isProfileComplete: v.optional(v.boolean()), // ADDED: Flag to indicate profile completion
    isOnboardingComplete: v.optional(v.boolean()), // ADDED: Flag to indicate onboarding completion

    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()), // Consider v.float64() for timestamp if more precision needed
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other"))
    ),
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
    // Location fields
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    // Physical attributes
    height: v.optional(v.string()), // store as '5ft 7in'
    // Life status
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("divorced"),
        v.literal("widowed"),
        v.literal("annulled")
      )
    ),
    // Education and career
    education: v.optional(v.string()),
    occupation: v.optional(v.string()),
    annualIncome: v.optional(v.number()), // Store as number
    // Personal details
    aboutMe: v.optional(v.string()), // A brief bio
    motherTongue: v.optional(v.string()), // Primary language spoken
    religion: v.optional(v.string()), // Religious affiliation
    ethnicity: v.optional(v.string()), // Ethnic background
    // Lifestyle/contact fields
    phoneNumber: v.optional(v.string()),
    diet: v.optional(
      v.union(
        v.literal("vegetarian"),
        v.literal("non-vegetarian"),
        v.literal("vegan"),
        v.literal("eggetarian"),
        v.literal("other"),
        v.literal("")
      )
    ),
    smoking: v.optional(
      v.union(
        v.literal("no"),
        v.literal("occasionally"),
        v.literal("yes"),
        v.literal("")
      )
    ),
    drinking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    physicalStatus: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("differently-abled"),
        v.literal("other"),
        v.literal("")
      )
    ),
    // Partner Preferences (can be a separate table or embedded object if complex)
    // For simplicity, keeping a few optional fields here
    partnerPreferenceAgeMin: v.optional(
      v.union(v.number(), v.string(), v.literal(""))
    ),
    partnerPreferenceAgeMax: v.optional(
      v.union(v.number(), v.string(), v.literal(""))
    ),
    partnerPreferenceReligion: v.optional(v.array(v.string())),
    partnerPreferenceCity: v.optional(v.array(v.string())),

    profileImageIds: v.optional(v.array(v.id("_storage"))),
    profileImageUrls: v.optional(v.array(v.string())),
    banned: v.optional(v.boolean()),

    email: v.optional(v.string()),
    // Timestamps
    createdAt: v.float64(), // Automatically set by Convex?
    updatedAt: v.optional(v.float64()),
    boostsRemaining: v.optional(v.number()),
    boostedUntil: v.optional(v.float64()),
    subscriptionPlan: v.optional(
      v.union(v.literal("free"), v.literal("premium"), v.literal("premiumPlus"))
    ),
    subscriptionExpiresAt: v.optional(v.number()),
    // Spotlight badge fields
    hasSpotlightBadge: v.optional(v.boolean()),
    spotlightBadgeExpiresAt: v.optional(v.number()),
    boostsMonth: v.optional(v.number()),
    
    // Biometric authentication settings
    biometricSettings: v.optional(v.object({
      enabled: v.boolean(),
      autoLogin: v.boolean(),
      requireBiometricForPayments: v.boolean(),
      requireBiometricForSensitiveActions: v.boolean(),
      fallbackToPin: v.boolean(),
      lockoutDuration: v.number(), // in minutes
      maxFailedAttempts: v.number(),
      enabledAt: v.optional(v.float64()),
      lastUsed: v.optional(v.float64()),
    })),

    // Registered biometric devices
    biometricDevices: v.optional(v.array(v.object({
      deviceId: v.string(),
      deviceName: v.optional(v.string()),
      platform: v.union(v.literal("ios"), v.literal("android")),
      registeredAt: v.float64(),
      lastUsed: v.optional(v.float64()),
      isActive: v.boolean(),
    }))),
  })
    .index("by_userId", ["userId"])
    .index("by_clerkId", ["clerkId"]),

  // The sessions table is no longer needed with Clerk
  // sessions: defineTable({
  //   userId: v.id("users"),
  //   token: v.string(),
  //   expiresAt: v.float64(),
  // })
  // .index("by_userId", ["userId"]),

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    createdAt: v.float64(),
  }),

  blogPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()), // Optional cover image for blog post
    categories: v.optional(v.array(v.string())), // Blog categories
    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
  }).index("by_slug", ["slug"]),

  interests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.float64(),
  })
    .index("by_from_to", ["fromUserId", "toUserId"])
    .index("by_to", ["toUserId"]),

  messages: defineTable({
    conversationId: v.string(), // e.g., sorted user IDs joined by '_'
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    text: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("voice"), v.literal("image"))), // message type
    audioStorageId: v.optional(v.string()), // Convex storage ID for voice messages
    duration: v.optional(v.number()), // duration in seconds for voice messages
    fileSize: v.optional(v.number()), // file size in bytes
    mimeType: v.optional(v.string()), // MIME type for audio files
    createdAt: v.float64(),
    readAt: v.optional(v.float64()), // timestamp when recipient read the message
  })
    .index("by_conversation", ["conversationId"])
    .index("by_to", ["toUserId"]),

  // Blocked users table
  blocks: defineTable({
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
    createdAt: v.float64(),
  })
    .index("by_blocker", ["blockerUserId"])
    .index("by_blocked", ["blockedUserId"]),

  chatbotMessages: defineTable({
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("bot")),
    text: v.string(),
    timestamp: v.float64(),
  }),

  images: defineTable({
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    // Make these fields optional to handle existing data
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    _creationTime: v.number(),
  }).index("by_user", ["userId"]),

  // Rate limits table for abuse prevention
  rateLimits: defineTable({
    key: v.string(), // e.g., IP address or user ID + endpoint
    windowStart: v.float64(), // timestamp of window start
    count: v.int64(), // number of requests in window
  }).index("by_key", ["key"]),

  blogImages: defineTable({
    storageId: v.string(),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    createdAt: v.float64(),
  }),

  profileViews: defineTable({
    viewerId: v.id("users"),
    profileId: v.id("profiles"),
    createdAt: v.float64(),
  }).index("by_profileId_createdAt", ["profileId", "createdAt"]),

  // Push notification registrations
  pushNotifications: defineTable({
    userId: v.id("users"),
    playerId: v.string(),
    deviceType: v.string(),
    deviceToken: v.optional(v.string()),
    registeredAt: v.float64(),
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_playerId", ["playerId"]),

  // Delivery receipts for messages
  deliveryReceipts: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    status: v.union(v.literal("delivered"), v.literal("read"), v.literal("failed")),
    timestamp: v.float64(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_userId", ["userId"]),

  // Typing indicators for conversations
  typingIndicators: defineTable({
    conversationId: v.string(),
    userId: v.id("users"),
    isTyping: v.boolean(),
    lastUpdated: v.float64(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"]),

  // Biometric authentication audit logs
  biometricAuditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(), // 'login', 'payment', 'settings_change', 'profile_access', 'sensitive_data'
    result: v.string(), // 'success', 'failure', 'lockout', 'user_cancel', 'biometric_error'
    deviceId: v.string(),
    platform: v.optional(v.union(v.literal("ios"), v.literal("android"), v.literal("web"))),
    timestamp: v.float64(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.object({
      errorMessage: v.optional(v.string()),
      attemptCount: v.optional(v.number()),
      biometricType: v.optional(v.string()), // 'fingerprint', 'face', 'iris'
    })),
  })
    .index("by_userId_timestamp", ["userId", "timestamp"])
    .index("by_deviceId", ["deviceId"]),

  // Usage tracking for subscription features
  usageTracking: defineTable({
    userId: v.id("users"),
    feature: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent")
    ),
    timestamp: v.float64(),
    metadata: v.optional(v.object({
      targetUserId: v.optional(v.id("users")),
      searchQuery: v.optional(v.string()),
      messageType: v.optional(v.string()),
    })),
  })
    .index("by_userId_feature_timestamp", ["userId", "feature", "timestamp"])
    .index("by_userId_timestamp", ["userId", "timestamp"]),

  // Monthly usage summaries for quick access
  usageSummaries: defineTable({
    userId: v.id("users"),
    month: v.string(), // Format: "YYYY-MM"
    feature: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent")
    ),
    count: v.number(),
    lastUpdated: v.float64(),
  })
    .index("by_userId_month_feature", ["userId", "month", "feature"])
    .index("by_userId_month", ["userId", "month"]),
});
