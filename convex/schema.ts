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
    // UK-centric fields
    ukCity: v.optional(v.string()),
    ukPostcode: v.optional(v.string()),
    // Religious and cultural background
    religion: v.optional(v.string()), // e.g., "Islam"
    caste: v.optional(v.string()), // Optional, as some may not identify with a caste
    motherTongue: v.optional(v.string()),
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
    partnerPreferenceUkCity: v.optional(v.array(v.string())),

    profileImageIds: v.optional(v.array(v.id("_storage"))),
    banned: v.optional(v.boolean()),
    hiddenFromSearch: v.optional(v.boolean()),
    email: v.optional(v.string()),
    // Timestamps
    createdAt: v.float64(), // Automatically set by Convex?
    updatedAt: v.optional(v.float64()),
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
    createdAt: v.float64(),
    // Optionally: read status, attachments, etc.
  }).index("by_conversation", ["conversationId"]),

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
});
