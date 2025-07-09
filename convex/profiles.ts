import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

/**
 * Get profile by user ID
 */
export const getProfileByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
  },
});

/**
 * Update a profile
 */
export const updateProfile = mutation({
  args: {
    profileId: v.id('profiles'),
    updates: v.object({
      fullName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('other'))
      ),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(
        v.union(
          v.literal('single'),
          v.literal('divorced'),
          v.literal('widowed'),
          v.literal('annulled')
        )
      ),
      education: v.optional(v.string()),
      occupation: v.optional(v.string()),
      annualIncome: v.optional(v.number()),
      phoneNumber: v.optional(v.string()),
      motherTongue: v.optional(v.string()),
      religion: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      diet: v.optional(v.string()),
      smoking: v.optional(v.string()),
      drinking: v.optional(v.string()),
      physicalStatus: v.optional(v.string()),
      partnerPreferenceAgeMin: v.optional(v.number()),
      partnerPreferenceAgeMax: v.optional(v.number()),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      preferredGender: v.optional(v.string()),
      profileImageIds: v.optional(v.array(v.id('_storage'))),
      profileImageUrls: v.optional(v.array(v.string())),
      isProfileComplete: v.optional(v.boolean()),
      isOnboardingComplete: v.optional(v.boolean()),
      subscriptionPlan: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
      boostsRemaining: v.optional(v.number()),
      boostedUntil: v.optional(v.number()),
      hasSpotlightBadge: v.optional(v.boolean()),
      spotlightBadgeExpiresAt: v.optional(v.number()),
      hideFromFreeUsers: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const updates = {
      ...args.updates,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.profileId, updates as any);
    
    return { success: true, message: 'Profile updated successfully' };
  },
});

/**
 * Create a new profile
 */
export const createProfile = mutation({
  args: {
    userId: v.id('users'),
    fullName: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const profileId = await ctx.db.insert('profiles', {
      userId: args.userId,
      fullName: args.fullName,
      email: args.email,
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: now,
      updatedAt: now,
      profileFor: 'self',
      subscriptionPlan: 'free',
    });

    return profileId;
  },
});

/**
 * Check profile completion status
 */
export const checkProfileCompletion = mutation({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return { isComplete: false };

    // Essential fields for completion
    const essentialFields = [
      'fullName',
      'dateOfBirth', 
      'gender',
      'city',
      'aboutMe',
    ];

    const isComplete = essentialFields.every(field => {
      const value = (profile as any)[field];
      return value && value.trim() !== '';
    });

    // Check for at least one image
    const hasImage = profile.profileImageIds && profile.profileImageIds.length > 0;
    
    const finalComplete = isComplete && hasImage;

    // Update profile if status changed
    if (profile.isProfileComplete !== finalComplete) {
      await ctx.db.patch(args.profileId, {
        isProfileComplete: finalComplete,
        isOnboardingComplete: finalComplete,
        updatedAt: Date.now(),
      });
    }

    return { isComplete: finalComplete };
  },
});

/**
 * Get public profile information
 */
export const getPublicProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile || profile.banned) {
      return null;
    }

    // Return only public fields
    return {
      fullName: profile.fullName,
      city: profile.city,
      country: profile.country,
      height: profile.height,
      maritalStatus: profile.maritalStatus,
      education: profile.education,
      occupation: profile.occupation,
      aboutMe: profile.aboutMe,
      profileImageIds: profile.profileImageIds,
      profileImageUrls: profile.profileImageUrls,
      createdAt: profile.createdAt,
      boostedUntil: profile.boostedUntil,
      hasSpotlightBadge: profile.hasSpotlightBadge,
    };
  },
});

/**
 * Search profiles with filters
 */
export const searchProfiles = query({
  args: {
    preferredGender: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ageMin: v.optional(v.number()),
    ageMax: v.optional(v.number()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allProfiles = await ctx.db.query('profiles').collect();
    
    // Filter profiles
    let filteredProfiles = allProfiles.filter(profile => {
      // Only complete, non-banned profiles
      if (!profile.isProfileComplete || profile.banned) return false;
      
      // Filter by gender
      if (args.preferredGender && args.preferredGender !== 'any') {
        if (profile.gender !== args.preferredGender) return false;
      }
      
      // Filter by city
      if (args.city && args.city !== 'any') {
        if (profile.city !== args.city) return false;
      }
      
      // Filter by country
      if (args.country && args.country !== 'any') {
        if (profile.country !== args.country) return false;
      }
      
      // Filter by age
      if (args.ageMin || args.ageMax) {
        if (!profile.dateOfBirth) return false;
        
        const dob = new Date(profile.dateOfBirth);
        if (isNaN(dob.getTime())) return false;
        
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        
        if (args.ageMin && age < args.ageMin) return false;
        if (args.ageMax && age > args.ageMax) return false;
      }
      
      return true;
    });

    // Sort: boosted first, then by creation date
    const now = Date.now();
    filteredProfiles.sort((a, b) => {
      const aBoost = a.boostedUntil && a.boostedUntil > now;
      const bBoost = b.boostedUntil && b.boostedUntil > now;
      
      if (aBoost && !bBoost) return -1;
      if (!aBoost && bBoost) return 1;
      
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Pagination
    const page = args.page || 0;
    const pageSize = args.pageSize || 20;
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedProfiles = filteredProfiles.slice(start, end);

    return {
      profiles: paginatedProfiles,
      total: filteredProfiles.length,
      page,
      pageSize,
    };
  },
});

/**
 * Get user's own profile
 */
export const getCurrentUserProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
  },
});

/**
 * Update subscription plan
 */
export const updateSubscription = mutation({
  args: {
    userId: v.id('users'),
    plan: v.union(
      v.literal('free'),
      v.literal('premium'), 
      v.literal('premiumPlus')
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      throw new Error('Profile not found');
    }

    await ctx.db.patch(profile._id, {
      subscriptionPlan: args.plan,
      subscriptionExpiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Boost profile (Premium Plus feature)
 */
export const boostProfile = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      throw new Error('Profile not found');
    }

    if (profile.subscriptionPlan !== 'premiumPlus') {
      throw new Error('Profile boost is only available for Premium Plus subscribers');
    }

    // Check monthly boost quota
    const now = new Date();
    const currentMonthKey = now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
    
    let boostsRemaining = profile.boostsRemaining || 0;
    const boostsMonth = (profile as any).boostsMonth;

    if (boostsMonth !== currentMonthKey) {
      boostsRemaining = 5; // Reset monthly quota
    }

    if (boostsRemaining <= 0) {
      throw new Error('No boosts remaining this month');
    }

    // Apply boost
    await ctx.db.patch(profile._id, {
      boostsRemaining: boostsRemaining - 1,
      boostsMonth: currentMonthKey,
      boostedUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      updatedAt: Date.now(),
    } as any);

    return { boostsRemaining: boostsRemaining - 1 };
  },
});

/**
 * Delete profile and user data
 */
export const deleteUserProfile = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (profile) {
      // Delete associated images
      if (profile.profileImageIds && profile.profileImageIds.length > 0) {
        try {
          await Promise.all(
            profile.profileImageIds.map(imageId => ctx.storage.delete(imageId))
          );
        } catch (error) {
          console.error('Error deleting profile images:', error);
        }
      }

      // Delete profile
      await ctx.db.delete(profile._id);
    }

    return { success: true };
  },
});