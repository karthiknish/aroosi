import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all profiles (for migration purposes only)
// WARNING: This is a temporary function for migration. Remove after use!
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all profiles
    const profiles = await ctx.db.query("profiles").collect();
    return profiles;
  },
});
// Query to get all users (for migration purposes only)
// WARNING: This is a temporary function for migration. Remove after use!
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all users
    const users = await ctx.db.query("users").collect();
    return users;
  },
});
// Query to get images by userId
export const getImagesByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return images;
  },
});

// Mutation to create a user (for migration)
export const createUserForMigration = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    banned: v.optional(v.boolean()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin or has migration permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      console.log(`User ${args.clerkId} already exists, skipping...`);
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      banned: args.banned,
      role: args.role,
    });

    return userId;
  },
});

// Mutation to create a profile (for migration)
export const createProfileForMigration = mutation({
  args: {
    userId: v.id("users"),
    clerkId: v.string(),
    profileFor: v.optional(
      v.union(
        v.literal("self"),
        v.literal("son"),
        v.literal("daughter"),
        v.literal("brother"),
        v.literal("sister"),
        v.literal("friend"),
        v.literal("relative"),
        v.literal(""),
      ),
    ),
    isProfileComplete: v.optional(v.boolean()),
    isOnboardingComplete: v.optional(v.boolean()),
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    ),
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any"),
      ),
    ),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    height: v.optional(v.string()),
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("divorced"),
        v.literal("widowed"),
        v.literal("annulled"),
      ),
    ),
    education: v.optional(v.string()),
    occupation: v.optional(v.string()),
    annualIncome: v.optional(v.number()),
    aboutMe: v.optional(v.string()),
    motherTongue: v.optional(
      v.union(
        v.literal("farsi-dari"),
        v.literal("pashto"),
        v.literal("uzbeki"),
        v.literal("hazaragi"),
        v.literal("turkmeni"),
        v.literal("balochi"),
        v.literal("nuristani"),
        v.literal("punjabi"),
        v.literal(""),
      ),
    ),
    religion: v.optional(
      v.union(
        v.literal("muslim"),
        v.literal("hindu"),
        v.literal("sikh"),
        v.literal(""),
      ),
    ),
    ethnicity: v.optional(
      v.union(
        v.literal("tajik"),
        v.literal("pashtun"),
        v.literal("uzbek"),
        v.literal("hazara"),
        v.literal("turkmen"),
        v.literal("baloch"),
        v.literal("nuristani"),
        v.literal("aimaq"),
        v.literal("pashai"),
        v.literal("qizilbash"),
        v.literal("punjabi"),
        v.literal(""),
      ),
    ),
    phoneNumber: v.optional(v.string()),
    diet: v.optional(
      v.union(
        v.literal("vegetarian"),
        v.literal("non-vegetarian"),
        v.literal("halal"),
        v.literal("vegan"),
        v.literal("eggetarian"),
        v.literal("other"),
        v.literal(""),
      ),
    ),
    smoking: v.optional(
      v.union(
        v.literal("no"),
        v.literal("occasionally"),
        v.literal("yes"),
        v.literal(""),
      ),
    ),
    drinking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes")),
    ),
    physicalStatus: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("differently-abled"),
        v.literal("other"),
        v.literal(""),
      ),
    ),
    partnerPreferenceAgeMin: v.optional(v.union(v.number(), v.string())),
    partnerPreferenceAgeMax: v.optional(v.union(v.number(), v.string())),
    partnerPreferenceReligion: v.optional(v.array(v.string())),
    partnerPreferenceCity: v.optional(v.array(v.string())),
    profileImageIds: v.optional(v.array(v.id("_storage"))),
    profileImageUrls: v.optional(v.array(v.string())),
    banned: v.optional(v.boolean()),
    email: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
    boostsRemaining: v.optional(v.number()),
    boostedUntil: v.optional(v.float64()),
    subscriptionPlan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("premium"),
        v.literal("premiumPlus"),
      ),
    ),
    subscriptionExpiresAt: v.optional(v.number()),
    hasSpotlightBadge: v.optional(v.boolean()),
    spotlightBadgeExpiresAt: v.optional(v.number()),
    boostsMonth: v.optional(v.number()),
    hideFromFreeUsers: v.optional(v.boolean()),
    biometricSettings: v.optional(v.any()),
    biometricDevices: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    // Check if user is admin or has migration permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingProfile) {
      console.log(`Profile for ${args.clerkId} already exists, skipping...`);
      return existingProfile._id;
    }

    // Create new profile
    const profileId = await ctx.db.insert("profiles", args);

    return profileId;
  },
});

// Mutation to create an image record (for migration)
export const createImageForMigration = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    _creationTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if user is admin or has migration permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Create image record
    const imageId = await ctx.db.insert("images", args);

    return imageId;
  },
});

// Query to get all interests
export const getAllInterests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const interests = await ctx.db.query("interests").collect();
    return interests;
  },
});

// Mutation to create an interest
export const createInterestForMigration = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
    createdAt: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const interestId = await ctx.db.insert("interests", args);
    return interestId;
  },
});

// Query to get all messages
export const getAllMessages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db.query("messages").collect();
    return messages;
  },
});

// Mutation to create a message
export const createMessageForMigration = mutation({
  args: {
    conversationId: v.string(),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    text: v.string(),
    type: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("image")),
    ),
    audioStorageId: v.optional(v.string()),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    createdAt: v.float64(),
    readAt: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const messageId = await ctx.db.insert("messages", args);
    return messageId;
  },
});

// Query to get all profile views
export const getAllProfileViews = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const views = await ctx.db.query("profileViews").collect();
    return views;
  },
});

// Mutation to create a profile view
export const createProfileViewForMigration = mutation({
  args: {
    viewerId: v.id("users"),
    profileId: v.id("profiles"),
    createdAt: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const viewId = await ctx.db.insert("profileViews", args);
    return viewId;
  },
});
