/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";
import {
  internalMutation,
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
  action,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { requireAdmin } from "./utils/requireAdmin";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api"; // Ensure internal is imported

// Simplified Convex-side profile interface.
// Convex mutations often patch partial objects and accept runtime-validated values, so the compile-time type must be permissive.
export interface ConvexProfile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  email?: string;
  // Allow any additional fields with flexible types
  [key: string]: any;
}

// Re-export as `Profile` so existing Convex files that import { Profile } remain valid.
export type Profile = ConvexProfile;

// Types based on schema
export interface User {
  _id: Id<"users">;
  email: string;
  banned?: boolean;
  role?: string;
  googleId?: string;
  emailVerified?: boolean;
  hashedPassword?: string;
  refreshVersion?: number;
}

// Public-facing profile type (for getUserPublicProfile)
export interface PublicProfile {
  fullName?: string;
  city?: string;
  height?: string;
  maritalStatus?: "single" | "divorced" | "widowed" | "annulled";
  education?: string;
  occupation?: string;
  aboutMe?: string;
  profileImageIds?: Id<"_storage">[];
  createdAt: number;
  // Add more fields as needed, but do not include _id, userId, email
  [key: string]: unknown;
}

// --- Helper function to get user by email ---
const getUserByEmailInternal = async (
  ctx: QueryCtx | MutationCtx,
  email: string
) => {
  const lower = email.toLowerCase();
  const all = await ctx.db.query("users").collect();
  return (
    all.find(
      (u) => typeof u.email === "string" && u.email.toLowerCase() === lower
    ) || null
  );
};

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Retrieves the user record and their profile for the currently authenticated user.
 */
/**
 * Get a profile by its ID (for internal use)
 */
export const getProfile = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) {
      throw new Error(`Profile with ID ${args.id} not found`);
    }
    return profile;
  },
});

/**
 * Retrieves the user record and their profile for the currently authenticated user.
 */
export const getCurrentUserWithProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Not authenticated or token is invalid
      return null;
    }

    const user = await getUserByEmailInternal(ctx, identity.email!);

    if (!user) {
      console.warn(`User with email ${identity.email} not found in Convex DB.`);
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    // Ensure profileImageIds is included in the response
    const profileWithImages = profile
      ? {
          ...profile,
          profileImageIds: profile.profileImageIds || [],
          profileImageUrls: profile.profileImageUrls || [],
        }
      : null;

    return { ...user, profile: profileWithImages };
  },
});

/**
 * Internal mutation to create or update a user.
 * Used by auth system to ensure user exists in Convex.
 */
export const createUserViaSignup = action({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      email,
      hashedPassword,
      fullName,
    }: { email: string; hashedPassword: string; fullName?: string }
  ): Promise<{ userId: Id<"users"> }> => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.internalUpsertUser,
      {
        email: normalizedEmail,
        hashedPassword,
        fullName,
      }
    );
    return { userId };
  },
});

/**
 * Public query used to fetch profile by userId (for internal actions to call via runQuery)
 */
export const getProfileByUserIdPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile ?? null;
  },
});

/**
 * Internal query: get profile by userId (usable from actions)
 */
/* removed duplicate _getProfileByUserId; use the typed version below or call getProfileByUserIdPublic directly */

/**
 * Combined action for native signup that can also create a full profile
 * when profile fields are provided from the signup form.
 *
 * It preserves existing profiles (won't overwrite), and if no profile exists,
 * it calls the existing createProfile mutation with the provided fields.
 */
/**
 * Internal mutation to create a profile directly by userId (bypasses auth identity).
 * Mirrors createProfile normalization, but requires explicit userId.
 */

export const internalCreateProfile = internalMutation(
  async (
    ctx,
    args: {
      userId: Id<"users">;
      fullName: string;
      dateOfBirth: string;
      gender: "male" | "female" | "other";
      city: string;
      aboutMe: string;
      occupation: string;
      education: string;
      height: string;
      maritalStatus: "single" | "divorced" | "widowed" | "annulled";
      phoneNumber: string;

      profileFor?:
        | "self"
        | "son"
        | "daughter"
        | "brother"
        | "sister"
        | "friend"
        | "relative"
        | "";
      country?: string;
      annualIncome?: string | number;
      email?: string;
      profileImageIds?: Id<"_storage">[];
      isProfileComplete?: boolean;
      preferredGender?: "male" | "female" | "other" | "any";
      motherTongue?:
        | "farsi-dari"
        | "pashto"
        | "uzbeki"
        | "hazaragi"
        | "turkmeni"
        | "balochi"
        | "nuristani"
        | "punjabi"
        | "";
      religion?: "muslim" | "hindu" | "sikh" | "";
      ethnicity?:
        | "tajik"
        | "pashtun"
        | "uzbek"
        | "hazara"
        | "turkmen"
        | "baloch"
        | "nuristani"
        | "aimaq"
        | "pashai"
        | "qizilbash"
        | "punjabi"
        | "";
      diet?:
        | "vegetarian"
        | "non-vegetarian"
        | "halal"
        | "vegan"
        | "eggetarian"
        | "other"
        | "";
      physicalStatus?: "normal" | "differently-abled" | "";
      smoking?: "no" | "occasionally" | "yes" | "";
      drinking?: "no" | "occasionally" | "yes";
      partnerPreferenceAgeMin?: number;
      partnerPreferenceAgeMax?: number;
      partnerPreferenceCity?: string[];
      subscriptionPlan?: "free" | "premium" | "premiumPlus";
    }
  ): Promise<Id<"profiles">> => {
    // Prevent duplicate
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) return existing._id;

    const coalesce = <T>(v: T | undefined | null, def: T): T =>
      v === undefined || v === null ? def : v;

    const normalizedHeight =
      typeof args.height === "string" && args.height.trim().length > 0
        ? args.height.trim()
        : args.height !== undefined && args.height !== null
          ? String(args.height)
          : "";

    const annualIncomeNum =
      typeof args.annualIncome === "number"
        ? args.annualIncome
        : typeof args.annualIncome === "string" &&
            args.annualIncome.trim().length > 0
          ? Number(args.annualIncome.replace(/[^\d]/g, ""))
          : undefined;

    const record: any = {
      userId: args.userId,
      email: args.email,
      isProfileComplete: args.isProfileComplete ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      banned: false,

      profileFor: coalesce(args.profileFor, "self"),
      fullName: coalesce(args.fullName, ""),
      dateOfBirth: coalesce(args.dateOfBirth, ""),
      gender: coalesce(args.gender, ""),
      preferredGender: coalesce(args.preferredGender, ""),

      city: coalesce(args.city, ""),
      country: coalesce(args.country, ""),

      height: normalizedHeight,
      maritalStatus: coalesce(args.maritalStatus, "single"),
      physicalStatus: coalesce(args.physicalStatus, "normal"),
      diet: coalesce(args.diet, ""),
      smoking: coalesce(args.smoking, "no"),
      drinking: coalesce(args.drinking, "no"),

      motherTongue: coalesce(args.motherTongue, ""),
      religion: coalesce(args.religion, ""),
      ethnicity: coalesce(args.ethnicity, ""),

      education: coalesce(args.education, ""),
      occupation: coalesce(args.occupation, ""),
      annualIncome: annualIncomeNum,

      phoneNumber: coalesce(args.phoneNumber, ""),
      aboutMe: coalesce(args.aboutMe, ""),

      partnerPreferenceAgeMin: args.partnerPreferenceAgeMin,
      partnerPreferenceAgeMax: args.partnerPreferenceAgeMax,
      partnerPreferenceCity: Array.isArray(args.partnerPreferenceCity)
        ? args.partnerPreferenceCity
        : [],

      profileImageIds: Array.isArray(args.profileImageIds)
        ? args.profileImageIds
        : [],

      subscriptionPlan: coalesce(args.subscriptionPlan, "free"),
      subscriptionExpiresAt:
        args.subscriptionPlan && args.subscriptionPlan !== "free"
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : undefined,
    };

    const images = record.profileImageUrls || record.profileImageIds;
    const hasImage = Array.isArray(images) && images.length > 0;

    const essentials = ["fullName", "dateOfBirth", "gender", "city", "aboutMe"];
    const allEssentials = essentials.every((k) => {
      const v = record[k];
      return !(
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "")
      );
    });

    // Mark complete when essential fields are filled.
    // Profile image is OPTIONAL and not required for completion.
    if (allEssentials) {
      record.isProfileComplete = true;
      record.isOnboardingComplete = true;
    } else {
      record.isProfileComplete = record.isProfileComplete ?? false;
      record.isOnboardingComplete = record.isProfileComplete === true;
    }

    const profileId = await ctx.db.insert("profiles", record);
    return profileId;
  }
);

export const createUserAndProfileViaSignup = action({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    fullName: v.optional(v.string()),
    profile: v.optional(
      v.object({
        // Mirror the args in createProfile. All optional here; createProfile enforces its own requirements.
        fullName: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        gender: v.optional(
          v.union(v.literal("male"), v.literal("female"), v.literal("other"))
        ),
        city: v.optional(v.string()),
        aboutMe: v.optional(v.string()),
        occupation: v.optional(v.string()),
        education: v.optional(v.string()),
        height: v.optional(v.string()),
        maritalStatus: v.optional(
          v.union(
            v.literal("single"),
            v.literal("divorced"),
            v.literal("widowed"),
            v.literal("annulled")
          )
        ),
        phoneNumber: v.optional(v.string()),
        profileFor: v.optional(
          v.union(
            v.literal("self"),
            v.literal("son"),
            v.literal("daughter"),
            v.literal("brother"),
            v.literal("sister"),
            v.literal("friend"),
            v.literal("relative"),
            v.literal("")
          )
        ),
        country: v.optional(v.string()),
        annualIncome: v.optional(v.union(v.string(), v.number())),
        email: v.optional(v.string()),
        profileImageIds: v.optional(v.array(v.id("_storage"))),
        isProfileComplete: v.optional(v.boolean()),
        preferredGender: v.optional(
          v.union(
            v.literal("male"),
            v.literal("female"),
            v.literal("other"),
            v.literal("any")
          )
        ),
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
            v.literal("")
          )
        ),
        religion: v.optional(
          v.union(
            v.literal("muslim"),
            v.literal("hindu"),
            v.literal("sikh"),
            v.literal("")
          )
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
            v.literal("")
          )
        ),
        diet: v.optional(
          v.union(
            v.literal("vegetarian"),
            v.literal("non-vegetarian"),
            v.literal("halal"),
            v.literal("vegan"),
            v.literal("eggetarian"),
            v.literal("other"),
            v.literal("")
          )
        ),
        physicalStatus: v.optional(
          v.union(
            v.literal("normal"),
            v.literal("differently-abled"),
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
        partnerPreferenceAgeMin: v.optional(v.number()),
        partnerPreferenceAgeMax: v.optional(v.number()),
        partnerPreferenceCity: v.optional(v.array(v.string())),
        subscriptionPlan: v.optional(
          v.union(
            v.literal("free"),
            v.literal("premium"),
            v.literal("premiumPlus")
          )
        ),
      })
    ),
  },
  handler: async (
    ctx,
    {
      email,
      hashedPassword,
      fullName,
      profile,
    }: {
      email: string;
      hashedPassword: string;
      fullName?: string;
      profile?: Record<string, unknown>;
    }
  ): Promise<{ userId: Id<"users">; profileId?: Id<"profiles"> }> => {
    const normalizedEmail = email.toLowerCase().trim();

    // 1) Ensure user exists
    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.internalUpsertUser,
      {
        email: normalizedEmail,
        hashedPassword,
        fullName,
      }
    );

    // 2) If no profile payload, we're done
    if (!profile || Object.keys(profile).length === 0) {
      return { userId };
    }

    // 3) Check for existing profile using public query (callable from actions)
    const existing = await ctx.runQuery(api.users.getProfileByUserIdPublic, {
      userId,
    });

    // Helper to build normalized payload from provided profile
    const payload = {
      // Required for createProfile (use provided or minimal sensible defaults)
      fullName: (profile.fullName as string) ?? fullName ?? "",
      dateOfBirth: (profile.dateOfBirth as string) ?? "",
      gender: (profile.gender as "male" | "female" | "other") ?? "other",
      city: (profile.city as string) ?? "",
      aboutMe: (profile.aboutMe as string) ?? "",
      occupation: (profile.occupation as string) ?? "",
      education: (profile.education as string) ?? "",
      height: (profile.height as string) ?? "",
      maritalStatus:
        (profile.maritalStatus as
          | "single"
          | "divorced"
          | "widowed"
          | "annulled") ?? "single",
      phoneNumber: (profile.phoneNumber as string) ?? "",

      // Optional passthroughs
      profileFor: profile.profileFor as
        | "self"
        | "son"
        | "daughter"
        | "brother"
        | "sister"
        | "friend"
        | "relative"
        | "",
      country: profile.country as string | undefined,
      // createProfile used to expect string; internalCreateProfile accepts string|number; keep string here
      annualIncome:
        typeof profile.annualIncome === "number"
          ? String(profile.annualIncome)
          : (profile.annualIncome as string | undefined),
      email: (profile.email as string) ?? normalizedEmail,
      profileImageIds: profile.profileImageIds as Id<"_storage">[] | undefined,
      isProfileComplete: profile.isProfileComplete as boolean | undefined,
      preferredGender: profile.preferredGender as
        | "male"
        | "female"
        | "other"
        | "any"
        | undefined,
      motherTongue: profile.motherTongue as
        | "farsi-dari"
        | "pashto"
        | "uzbeki"
        | "hazaragi"
        | "turkmeni"
        | "balochi"
        | "nuristani"
        | "punjabi"
        | "",
      religion: profile.religion as "muslim" | "hindu" | "sikh" | "",
      ethnicity: profile.ethnicity as
        | "tajik"
        | "pashtun"
        | "uzbek"
        | "hazara"
        | "turkmen"
        | "baloch"
        | "nuristani"
        | "aimaq"
        | "pashai"
        | "qizilbash"
        | "punjabi"
        | "",
      diet: profile.diet as
        | "vegetarian"
        | "non-vegetarian"
        | "halal"
        | "vegan"
        | "eggetarian"
        | "other"
        | "",
      physicalStatus: profile.physicalStatus as
        | "normal"
        | "differently-abled"
        | "",
      smoking: profile.smoking as "no" | "occasionally" | "yes" | "",
      drinking: profile.drinking as "no" | "occasionally" | "yes" | undefined,
      partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin as
        | number
        | undefined,
      partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax as
        | number
        | undefined,
      partnerPreferenceCity: profile.partnerPreferenceCity as
        | string[]
        | undefined,
      subscriptionPlan: profile.subscriptionPlan as
        | "free"
        | "premium"
        | "premiumPlus"
        | undefined,
    };

    // If a profile already exists, detect "stub" and patch it instead of returning early
    if (existing) {
      // Determine if existing is a stub (essentials empty and no images)
      const essentials = [
        "fullName",
        "dateOfBirth",
        "gender",
        "city",
        "aboutMe",
      ] as const;
      const allEssentialsEmpty = essentials.every((k) => {
        const v = (existing as any)[k];
        return (
          v === undefined ||
          v === null ||
          (typeof v === "string" && v.trim() === "")
        );
      });
      const images =
        (existing as any).profileImageUrls || (existing as any).profileImageIds;
      const hasImage = Array.isArray(images) && images.length > 0;

      // Always patch the existing stub profile with provided values during signup.
      // This ensures fields from the signup payload are persisted instead of leaving the stub empty.
      {
        // Build patch updates, converting annualIncome to number if string
        const updates: Record<string, any> = { ...payload };

        if (
          typeof updates.annualIncome === "string" &&
          updates.annualIncome.trim().length > 0
        ) {
          const num = Number(updates.annualIncome.replace(/[^\d]/g, ""));
          updates.annualIncome = isNaN(num) ? undefined : num;
        }

        // Recompute completion flags
        const essentialsFilled = essentials.every((k) => {
          const v = updates[k];
          return !(
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "")
          );
        });
        // Profile image is OPTIONAL and not required for completion.
        updates.isProfileComplete = essentialsFilled ? true : false;
        updates.isOnboardingComplete = updates.isProfileComplete === true;
        updates.updatedAt = Date.now();

        // Prefer internal patch that bypasses admin guard during controlled signup flow
        await ctx.runMutation(internal.users.internalPatchProfile, {
          profileId: (existing as any)._id,
          updates,
        } as any);
        return { userId, profileId: (existing as any)._id };
      }

      // If we reached here, we already patched above. Return userId only.
      // return { userId };
    }

    // 4) No existing profile → create full profile via internal mutation
    try {
      const profileId = await ctx.runMutation(
        internal.users.internalCreateProfile,
        {
          userId,
          ...payload,
        } as any
      );
      return { userId, profileId };
    } catch (e) {
      console.warn(
        "createUserAndProfileViaSignup: internalCreateProfile failed, proceeding with user only",
        e
      );
      return { userId };
    }
  },
});

// Internal patch used by actions where admin identity isn't present (e.g., signup flow)
export const internalPatchProfile = internalMutation(
  async (
    ctx,
    args: { profileId: Id<"profiles">; updates: Record<string, unknown> }
  ) => {
    const { profileId, updates } = args;
    // Normalize annualIncome if provided as string
    const mutable: any = { ...updates };
    if (typeof mutable.annualIncome === "string") {
      const parsed = parseInt(mutable.annualIncome, 10);
      if (!Number.isNaN(parsed)) {
        mutable.annualIncome = parsed;
      } else {
        delete mutable.annualIncome;
      }
    }
    // Always bump updatedAt
    mutable.updatedAt = Date.now();
    await ctx.db.patch(profileId, mutable);
  }
);

export const internalUpsertUser = internalMutation(
  async (
    ctx,
    {
      email,
      hashedPassword,
      role,
      fullName,
      googleId,
    }: {
      email: string;
      hashedPassword?: string;
      role?: string;
      fullName?: string;
      googleId?: string;
    }
  ): Promise<Id<"users">> => {
    const existingUser = await getUserByEmailInternal(ctx, email);

    let userId;

    if (existingUser) {
      userId = existingUser._id;
      const update: Partial<User> = {};
      if (role && existingUser.role !== role) update.role = role;
      if (googleId && !existingUser.googleId) update.googleId = googleId;
      if (Object.keys(update).length > 0) {
        await ctx.db.patch(userId, update);
      }
    } else {
      userId = await ctx.db.insert("users", {
        email,
        hashedPassword: hashedPassword || "",
        role: role ?? "user",
        banned: false,
        googleId,
        emailVerified: !!googleId, // Google users are pre-verified
        createdAt: Date.now(),
      });
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existingProfile) {
      await ctx.db.insert("profiles", {
        userId,
        email,
        isProfileComplete: false,
        isOnboardingComplete: false,
        createdAt: Date.now(),
        profileFor: "self",
        fullName: fullName,
        dateOfBirth: undefined,
        subscriptionPlan: "free",
      } as any);
      console.log(`Created new profile for user ${userId}`);
    } else {
      const profileUpdates: any = {};
      if (existingProfile.email !== email) {
        profileUpdates.email = email;
      }
      if (fullName && !existingProfile.fullName) {
        profileUpdates.fullName = fullName;
      }
      if (existingProfile.isOnboardingComplete === undefined) {
        profileUpdates.isOnboardingComplete = false;
      }
      if (existingProfile.isProfileComplete === undefined) {
        profileUpdates.isProfileComplete = false;
      }
      if (existingProfile.subscriptionPlan === undefined) {
        profileUpdates.subscriptionPlan = "free";
      }
      if (Object.keys(profileUpdates).length > 0) {
        await ctx.db.patch(existingProfile._id, profileUpdates);
      }
      if (existingProfile.createdAt === undefined) {
        await ctx.db.patch(existingProfile._id, { createdAt: Date.now() });
      }
    }

    return userId;
  }
);

/**
 * Updates the profile for the currently authenticated user.
 */
export const updateProfile = mutation({
  args: {
    updates: v.object({
      fullName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal("male"), v.literal("female"), v.literal("other"))
      ),
      city: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      religion: v.optional(v.string()),
      occupation: v.optional(v.string()),
      education: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(
        v.union(
          v.literal("single"),
          v.literal("divorced"),
          v.literal("widowed"),
          v.literal("annulled")
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
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      isProfileComplete: v.optional(v.boolean()),
      country: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      annualIncome: v.optional(v.union(v.number(), v.string(), v.literal(""))),
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
      physicalStatus: v.optional(
        v.union(
          v.literal("normal"),
          v.literal("differently-abled"),
          v.literal("other"),
          v.literal("")
        )
      ),
      partnerPreferenceAgeMin: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceAgeMax: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      preferredGender: v.optional(
        v.union(
          v.literal("male"),
          v.literal("female"),
          v.literal("any"),
          v.literal("other")
        )
      ),
      updatedAt: v.optional(v.number()),
      // Subscription related fields
      subscriptionPlan: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium"),
          v.literal("premiumPlus")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
      boostsRemaining: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    // Find user by Clerk ID
    const user = await getUserByEmailInternal(ctx, identity.email!);

    if (!user) {
      return { success: false, message: "User not found in Convex" };
    }

    // Find profile by user ID
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Use a temporary mutable object to allow transformation before final typing

    const mutableUpdates: any = { ...args.updates };

    // Ensure annualIncome is stored as a number if provided as string
    if (typeof mutableUpdates.annualIncome === "string") {
      const parsedIncome = parseInt(mutableUpdates.annualIncome, 10);
      if (isNaN(parsedIncome)) {
        delete mutableUpdates.annualIncome;
      } else {
        mutableUpdates.annualIncome = parsedIncome;
      }
    }

    const processedUpdates: Partial<Omit<Profile, "_id">> = mutableUpdates;

    // Ensure updatedAt is always set on any profile modification
    processedUpdates.updatedAt = Date.now();

    try {
      // Recalculate isProfileComplete and isOnboardingComplete

      const updatedProfile = { ...profile, ...processedUpdates } as any;
      let allEssentialFilled2 = true;
      for (const field of [
        "fullName",
        "dateOfBirth",
        "gender",
        "city",
        "aboutMe",
      ]) {
        const value = updatedProfile[field];
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          allEssentialFilled2 = false;
          break;
        }
      }
      const images2 = updatedProfile.profileImageIds;
      // Profile image is OPTIONAL and not required for completion.
      if (allEssentialFilled2) {
        processedUpdates.isProfileComplete = true;
        (
          processedUpdates as Partial<Omit<Profile, "_id">> & {
            isOnboardingComplete?: boolean;
          }
        ).isOnboardingComplete = true;
      } else {
        processedUpdates.isProfileComplete = false;
        (
          processedUpdates as Partial<Omit<Profile, "_id">> & {
            isOnboardingComplete?: boolean;
          }
        ).isOnboardingComplete = false;
      }

      // Update the profile
      await ctx.db.patch(profile._id, processedUpdates);

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      return { success: false, message: "Failed to update profile" };
    }
  },
});

/**
 * Retrieves a user's public profile information.
 * This is for displaying profiles to other users. Filter sensitive information.
 */
export const getUserPublicProfile = query({
  args: { userId: v.id("users") }, // Or use email: v.string() if you want to query by that
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.warn(
        `Public profile query: User with Convex ID ${args.userId} not found.`
      );
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile) {
      console.warn(
        `Public profile query: Profile for user ${user._id} not found.`
      );
      return null;
    }

    if (profile.banned === true) {
      // Hide banned profiles from the frontend
      return null;
    }

    // Explicitly list fields to return for public view to ensure privacy
    return {
      // Profile-related info
      profile: {
        fullName: profile.fullName,
        city: profile.city,
        height: profile.height,
        maritalStatus: profile.maritalStatus,
        education: profile.education,
        occupation: profile.occupation,
        aboutMe: profile.aboutMe,
        profileImageIds: profile.profileImageIds,
        profileImageUrls: profile.profileImageUrls,
        createdAt: profile.createdAt, // Useful for 'Member since'
      },
    };
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.blockerUserId === args.blockedUserId)
      throw new Error("Cannot block yourself");
    // Prevent duplicate blocks
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const existing = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    if (existing) return { success: true };
    await ctx.db.insert("blocks", {
      blockerUserId: args.blockerUserId,
      blockedUserId: args.blockedUserId,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const block = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    if (block) await ctx.db.delete(block._id);
    return { success: true };
  },
});

// Check if a user has blocked another
export const isBlocked = query({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const block = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    return !!block;
  },
});

export const batchGetPublicProfiles = action({
  args: { userIds: v.array(v.id("users")) },
  handler: async (
    ctx,
    args
  ): Promise<Array<{ userId: Id<"users">; profile: PublicProfile }>> => {
    if (!args.userIds.length) {
      // Return all public, complete, not-hidden, not-banned profiles
      const users = await ctx.runQuery(api.users.listUsersWithProfiles, {
        preferredGender: "any",
      });
      // users is an array of user objects with .profile attached
      return users
        .filter(
          (user: any) =>
            user.role !== "admin" &&
            user.banned !== true &&
            user.profile &&
            user.profile.profileFor !== undefined &&
            user.profile.isProfileComplete === true &&
            user.profile.banned !== true
        )
        .map((user: any) => ({
          userId: user._id,
          profile: user.profile! as PublicProfile,
        }));
    }
    // Otherwise, return only the specified users
    const results: Array<{
      userId: Id<"users">;
      profile: PublicProfile;
    } | null> = await Promise.all(
      args.userIds.map(async (userId) => {
        const res: { profile: PublicProfile } | null = await ctx.runQuery(
          api.users.getUserPublicProfile,
          { userId }
        );
        return res && res.profile ? { userId, profile: res.profile } : null;
      })
    );
    return results.filter(Boolean) as Array<{
      userId: Id<"users">;
      profile: PublicProfile;
    }>;
  },
});

// Helper to check admin

// List all profiles (for admin use only)
export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    return await ctx.db.query("profiles").collect();
  },
});

// Mutation to delete a profile by its _id
export const deleteProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(args.id);
    if (!profile) {
      // Already deleted or never existed
      return { success: true };
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const deleteCurrentUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });
    if (!user) {
      throw new ConvexError("User not found in Convex DB");
    }

    const email = user.email; // Store email before potentially deleting user document

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      // Delete associated images from storage
      if (profile.profileImageIds && profile.profileImageIds.length > 0) {
        try {
          await Promise.all(
            profile.profileImageIds.map((imageId) =>
              ctx.storage.delete(imageId)
            )
          );
          console.log(
            `Deleted ${profile.profileImageIds.length} images for profile ${profile._id}`
          );
        } catch (error) {
          console.error(
            `Error deleting images for profile ${profile._id}:`,
            error
          );
          // Non-fatal, continue with profile and user deletion
        }
      }
      // Delete the profile document
      await ctx.db.delete(profile._id);
      console.log(
        `Successfully deleted profile ${profile._id} for user ${user._id}`
      );
    } else {
      console.log(`No profile found for user ${user._id} to delete.`);
    }

    // Delete the user document from Convex
    await ctx.db.delete(user._id);
    console.log(
      `Successfully deleted user ${user._id} (email: ${email}) from Convex DB.`
    );

    return {
      success: true,
      message: "Profile and user deletion completed successfully.",
    };
  },
});

// Clerk user deletion function removed - using native authentication

export const adminUpdateProfile = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      fullName: v.optional(v.string()),
      city: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal("male"), v.literal("female"), v.literal("other"))
      ),
      dateOfBirth: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(
        v.union(
          v.literal("single"),
          v.literal("divorced"),
          v.literal("widowed"),
          v.literal("annulled")
        )
      ),
      education: v.optional(v.string()),
      occupation: v.optional(v.string()),
      annualIncome: v.optional(v.union(v.number(), v.string(), v.literal(""))),
      aboutMe: v.optional(v.string()),
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
      partnerPreferenceAgeMin: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceAgeMax: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      isProfileComplete: v.optional(v.boolean()),
      isOnboardingComplete: v.optional(v.boolean()),
      banned: v.optional(v.boolean()),
      country: v.optional(v.string()),
      preferredGender: v.optional(
        v.union(
          v.literal("male"),
          v.literal("female"),
          v.literal("any"),
          v.literal("other")
        )
      ),
      updatedAt: v.optional(v.number()),
      // Subscription related fields
      subscriptionPlan: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium"),
          v.literal("premiumPlus")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    // Use a temporary mutable object to allow transformation before final typing

    const mutableAdminUpdates: any = { ...args.updates };

    if (typeof mutableAdminUpdates.annualIncome === "string") {
      const parsedIncome = parseInt(mutableAdminUpdates.annualIncome, 10);
      if (isNaN(parsedIncome)) {
        delete mutableAdminUpdates.annualIncome;
      } else {
        mutableAdminUpdates.annualIncome = parsedIncome;
      }
    }

    const processedUpdates: Partial<Omit<Profile, "_id">> = mutableAdminUpdates;

    const updatesWithTimestamp = {
      ...processedUpdates,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.id, updatesWithTimestamp);
    const updatedProfile = await ctx.db.get(args.id);

    return updatedProfile; // Return the full updated profile
  },
});

/**
 * Fetch a profile by its _id (for admin use)
 */
export const getProfileById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(args.id);
    return profile;
  },
});

/**
 * Get all mutual matches for a profile (admin use)
 * Returns an array of profile objects that are mutual matches with the given profile
 */
export const getMatchesForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // Get the profile
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return [];
    const userId = profile.userId;
    // Get all interests sent and received by this user
    const sent = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q) => q.eq("fromUserId", userId))
      .collect();
    const received = await ctx.db
      .query("interests")
      .withIndex("by_to", (q) => q.eq("toUserId", userId))
      .collect();
    // Find mutual matches: both users have accepted each other's interest
    const acceptedSent = sent.filter((i) => i.status === "accepted");
    const acceptedReceived = received.filter((i) => i.status === "accepted");
    const mutualUserIds = acceptedSent
      .map((i) => i.toUserId)
      .filter((id) => acceptedReceived.some((r) => r.fromUserId === id));
    // Get profiles for these userIds
    const allProfiles = await ctx.db.query("profiles").collect();
    const matches = allProfiles.filter((p) => mutualUserIds.includes(p.userId));
    return matches;
  },
});

/**
 * Admin: List profiles with search and pagination
 */
export const adminListProfiles = query({
  args: {
    search: v.optional(v.string()),
    page: v.number(),
    pageSize: v.number(),
  },
  handler: async (ctx, { search, page, pageSize }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    // Fetch all profiles and users
    let allProfiles = await ctx.db.query("profiles").collect();
    const users = await ctx.db.query("users").collect();

    // Only include complete profiles (example: must have fullName, city, religion, phoneNumber)
    allProfiles = allProfiles.filter(
      (p) =>
        p.fullName &&
        p.city &&
        p.phoneNumber &&
        typeof p.fullName === "string" &&
        typeof p.city === "string" &&
        typeof p.phoneNumber === "string"
    );

    // Apply search filter if provided
    if (search && search.trim() !== "") {
      const s = search.trim().toLowerCase();
      allProfiles = allProfiles.filter((p) => {
        const user = users.find((u) => u._id === p.userId);
        return (
          (p.fullName && p.fullName.toLowerCase().includes(s)) ||
          (p.city && p.city.toLowerCase().includes(s)) ||
          (p.phoneNumber && p.phoneNumber.toLowerCase().includes(s)) ||
          (user && user.email && user.email.toLowerCase().includes(s))
        );
      });
    }

    // Sort: boosted profiles first (boostedUntil in future), then by creation date desc
    const now = Date.now();
    allProfiles.sort((a, b) => {
      const aBoost = a.boostedUntil && a.boostedUntil > now;
      const bBoost = b.boostedUntil && b.boostedUntil > now;

      if (aBoost && !bBoost) return -1;
      if (!aBoost && bBoost) return 1;

      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });
    console.log("allProfiles:", allProfiles);
    const total = allProfiles.length;
    const safePage = Math.max(1, page);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    const profiles = allProfiles.slice(start, end);

    return { profiles, total, page, pageSize };
  },
});

export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(userId, { banned: true });
    // Optionally ban profile too
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: true });
    return { success: true };
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(userId, { banned: false });
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: false });
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
    // Delete user
    await ctx.db.delete(userId);
    return { success: true };
  },
});

export const listUsersWithProfiles = query({
  args: {
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    let filtered = users
      .filter((user) => user.role !== "admin") // Exclude admins
      .map((user) => ({
        ...user,
        profile:
          profiles.find((p) => p.userId === user._id && p.banned !== true) ||
          null,
      }));
    if (args.preferredGender && args.preferredGender !== "any") {
      filtered = filtered.filter(
        (u: any) => u.profile && u.profile.gender === args.preferredGender
      );
    }
    return filtered;
  },
});

export const userCounts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      totalUsers: users.length,
      bannedUsers: users.filter((u) => u.banned).length,
      completedProfiles: profiles.filter((p) => p.isProfileComplete).length,
      newThisWeek: users.filter((u) => u._creationTime > weekAgo).length,
      newThisMonth: users.filter((u) => u._creationTime > monthAgo).length,
    };
  },
});

export const updateProfileImageOrder = mutation({
  args: {
    userId: v.id("users"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { userId, imageIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }
    // Only allow updating your own profile
    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user || user._id !== userId) {
      return { success: false, error: "Unauthorized" };
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }
    await ctx.db.patch(profile._id, { profileImageIds: imageIds });
    return { success: true };
  },
});

export const createProfile = mutation({
  args: {
    // Align required fields with frontend onboarding requirements
    fullName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    city: v.string(),
    aboutMe: v.string(),
    occupation: v.string(),
    education: v.string(),
    height: v.string(),
    maritalStatus: v.union(
      v.literal("single"),
      v.literal("divorced"),
      v.literal("widowed"),
      v.literal("annulled")
    ),
    phoneNumber: v.string(),

    // Optional fields (kept as before)
    profileFor: v.optional(
      v.union(
        v.literal("self"),
        v.literal("son"),
        v.literal("daughter"),
        v.literal("brother"),
        v.literal("sister"),
        v.literal("friend"),
        v.literal("relative"),
        v.literal("")
      )
    ),
    country: v.optional(v.string()),
    annualIncome: v.optional(v.string()),
    email: v.optional(v.string()),
    profileImageIds: v.optional(v.array(v.id("_storage"))),
    isProfileComplete: v.optional(v.boolean()),
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
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
        v.literal("")
      )
    ),
    religion: v.optional(
      v.union(
        v.literal("muslim"),
        v.literal("hindu"),
        v.literal("sikh"),
        v.literal("")
      )
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
        v.literal("")
      )
    ),
    diet: v.optional(
      v.union(
        v.literal("vegetarian"),
        v.literal("non-vegetarian"),
        v.literal("halal"),
        v.literal("vegan"),
        v.literal("eggetarian"),
        v.literal("other"),
        v.literal("")
      )
    ),
    physicalStatus: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("differently-abled"),
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
    partnerPreferenceAgeMin: v.optional(v.number()),
    partnerPreferenceAgeMax: v.optional(v.number()),
    partnerPreferenceCity: v.optional(v.array(v.string())),
    // Subscription related fields
    subscriptionPlan: v.optional(
      v.union(v.literal("free"), v.literal("premium"), v.literal("premiumPlus"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    // Find user by Clerk ID
    const user = await getUserByEmailInternal(ctx, identity.email!);

    if (!user) {
      return { success: false, message: "User not found in Convex" };
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      return { success: false, message: "Profile already exists" };
    }

    // Create new profile - preserve provided values; only default when undefined/null
    const coalesce = <T>(v: T | undefined | null, def: T): T =>
      v === undefined || v === null ? def : v;

    // Normalize height to string consistently
    const normalizedHeight =
      typeof args.height === "string" && args.height.trim().length > 0
        ? args.height.trim()
        : args.height !== undefined && args.height !== null
          ? String(args.height)
          : "";

    const profileData: Omit<Profile, "_id"> = {
      userId: user._id,
      email: coalesce(args.email, user.email),
      isProfileComplete: args.isProfileComplete ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      banned: false,

      // Basic info
      profileFor: coalesce(args.profileFor, "self"),
      fullName: coalesce(args.fullName, ""),
      dateOfBirth: coalesce(args.dateOfBirth, ""),
      gender: coalesce(args.gender, ""),
      preferredGender: coalesce(args.preferredGender, ""),

      // Location
      city: coalesce(args.city, ""),
      country: coalesce(args.country, ""),

      // Physical & lifestyle
      height: normalizedHeight,
      maritalStatus: coalesce(args.maritalStatus, "single"),
      physicalStatus: coalesce(args.physicalStatus, "normal"),
      diet: coalesce(args.diet, ""),
      smoking: coalesce(args.smoking, "no"),
      drinking: coalesce(args.drinking, "no"),

      // Cultural
      motherTongue: coalesce(args.motherTongue, ""),
      religion: coalesce(args.religion, ""),
      ethnicity: coalesce(args.ethnicity, ""),

      // Education & career
      education: coalesce(args.education, ""),
      occupation: coalesce(args.occupation, ""),
      annualIncome:
        typeof args.annualIncome === "number"
          ? args.annualIncome
          : typeof args.annualIncome === "string" &&
              args.annualIncome.trim().length > 0
            ? Number(args.annualIncome.replace(/[^\d]/g, ""))
            : undefined,

      // Contact
      phoneNumber: coalesce(args.phoneNumber, ""),

      // About
      aboutMe: coalesce(args.aboutMe, ""),

      // Partner preferences
      partnerPreferenceAgeMin: args.partnerPreferenceAgeMin,
      partnerPreferenceAgeMax: args.partnerPreferenceAgeMax,
      partnerPreferenceCity: Array.isArray(args.partnerPreferenceCity)
        ? args.partnerPreferenceCity
        : [],

      // Images
      profileImageIds: Array.isArray(args.profileImageIds)
        ? args.profileImageIds
        : [],

      // Subscription
      subscriptionPlan: coalesce(args.subscriptionPlan, "free"),
      subscriptionExpiresAt:
        args.subscriptionPlan && args.subscriptionPlan !== "free"
          ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
          : undefined,
    };

    // Mark as complete if all essential fields are filled AND at least one image is present
    const essentialFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "city",
      "aboutMe",
    ];
    let allEssentialFilled = true;

    const profileDataForCheck = profileData as any;
    for (const field of essentialFields) {
      const value = profileDataForCheck[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        allEssentialFilled = false;
        break;
      }
    }
    const images =
      profileDataForCheck.profileImageUrls ||
      profileDataForCheck.profileImageIds;
    const hasImage = Array.isArray(images) && images.length > 0;

    if (allEssentialFilled && hasImage) {
      profileData.isProfileComplete = true;
      (profileData as any).isOnboardingComplete = true;
    } else {
      if (args.isProfileComplete === true) {
        profileData.isProfileComplete = true;
        (profileData as any).isOnboardingComplete = true;
      } else {
        profileData.isProfileComplete = false;
        (profileData as any).isOnboardingComplete = false;
      }
    }

    // Insert the profile with runtime-correct fields; suppress TS strictness
    const profileRecord = {
      createdAt: Date.now(),
      ...profileData,
    };

    const profileId = await ctx.db.insert("profiles", profileRecord as any);

    return {
      success: true,
      profileId,
      message: "Profile created successfully",
    };
  },
});

export const setProfileHiddenFromSearch = mutation({
  args: {
    profileId: v.id("profiles"),
    hidden: v.boolean(),
  },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // hiddenFromSearch field removed - this function is no longer needed
    return { success: true };
  },
});

/**
 * Returns all mutual matches for the currently authenticated user (not admin-only).
 */
export const getMyMatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user) return [];

    // Get matches from the matches table
    const matches1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .collect();

    const matches2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .collect();

    // Combine and get the other user's profile for each match
    const allMatches = [...matches1, ...matches2];
    const matchProfiles = await Promise.all(
      allMatches.map(async (match) => {
        const otherUserId =
          match.user1Id === user._id ? match.user2Id : match.user1Id;
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();

        return profile
          ? {
              ...profile,
              conversationId: match.conversationId,
              matchedAt: match.createdAt,
              lastActivity: match.lastActivity,
            }
          : null;
      })
    );

    return matchProfiles.filter(Boolean);
  },
});

export type ProfileDetailPageData = {
  currentUser: User | null;
  profileData: PublicProfile | null;
  isBlocked: boolean;
  isMutualInterest: boolean;
  sentInterest: Array<{
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
    status: "pending" | "accepted" | "rejected";
    createdAt: number;
  }>;
  userProfileImages: Array<{
    _id: string;
    storageId: string;
    url: string | null;
    fileName: string;
    uploadedAt: number;
  }>;
  userImages: Record<string, string | null>;
  currentUserProfileImagesData: Array<{
    _id: string;
    storageId: string;
    url: string | null;
    fileName: string;
    uploadedAt: number;
  }>;
  error?: string;
};

export const getProfileDetailPageData = action({
  args: { viewedUserId: v.id("users") },
  handler: async (ctx, { viewedUserId }): Promise<ProfileDetailPageData> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return {
        currentUser: null,
        profileData: null,
        isBlocked: false,
        isMutualInterest: false,
        sentInterest: [],
        userProfileImages: [],
        userImages: {},
        currentUserProfileImagesData: [],
        error: "Not authenticated",
      };

    // Get current user
    const currentUser: User | null = await ctx.runQuery(
      api.users.getCurrentUserWithProfile,
      {}
    );
    const currentUserId = currentUser?._id as Id<"users"> | undefined;

    // Get public profile for viewed user
    const publicProfileRes: { profile: PublicProfile } | null =
      await ctx.runQuery(api.users.getUserPublicProfile, {
        userId: viewedUserId,
      });
    const profileData: PublicProfile | null = publicProfileRes?.profile ?? null;

    // Blocked status
    let isBlocked: boolean = false;
    let isMutualInterest: boolean = false;
    let sentInterest: Array<{
      fromUserId: Id<"users">;
      toUserId: Id<"users">;
      status: "pending" | "accepted" | "rejected";
      createdAt: number;
    }> = [];

    if (currentUserId && viewedUserId && currentUserId !== viewedUserId) {
      isBlocked = await ctx.runQuery(api.users.isBlocked, {
        blockerUserId: currentUserId,
        blockedUserId: viewedUserId,
      });
      isMutualInterest = await ctx.runQuery(api.interests.isMutualInterest, {
        userA: currentUserId,
        userB: viewedUserId,
      });
      sentInterest = await ctx.runQuery(api.interests.getSentInterests, {
        userId: currentUserId,
      });
    }

    // Images for the profile being viewed
    const userProfileImages = await ctx.runQuery(api.images.getProfileImages, {
      userId: viewedUserId,
    });

    // Batch get profile images (for one user)
    const userImages = await ctx.runQuery(api.images.batchGetProfileImages, {
      userIds: [viewedUserId],
    });

    // Images for the current logged-in user
    let currentUserProfileImagesData: Array<{
      _id: string;
      storageId: string;
      url: string | null;
      fileName: string;
      uploadedAt: number;
    }> = [];

    if (currentUserId) {
      currentUserProfileImagesData = await ctx.runQuery(
        api.images.getProfileImages,
        {
          userId: currentUserId,
        }
      );
    }

    return {
      currentUser,
      profileData,
      isBlocked,
      isMutualInterest,
      sentInterest,
      userProfileImages,
      userImages,
      currentUserProfileImagesData,
    };
  },
});

export const searchPublicProfiles = query({
  args: {
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ageMin: v.optional(v.number()),
    ageMax: v.optional(v.number()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get current user
    const user = await getUserByEmailInternal(ctx, identity.email!);

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get all users and profiles
    const users = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("profiles").collect();

    // Join users and profiles
    const usersWithProfiles = users.map((u) => ({
      ...u,
      profile: allProfiles.find((p) => p.userId === u._id) || null,
    }));

    // Filter users based on criteria
    const filteredUsers = usersWithProfiles.filter((u) => {
      // Skip admin users
      if (u.role === "admin") return false;

      // Skip banned users
      if (u.banned) return false;

      // Skip users without profiles
      if (!u.profile) return false;

      // Skip incomplete profiles
      if (!u.profile.isProfileComplete) return false;

      // Skip banned profiles
      if (u.profile.banned) return false;

      // Filter by preferred gender
      if (args.preferredGender && args.preferredGender !== "any") {
        if (u.profile.gender !== args.preferredGender) return false;
      }

      // Filter by city
      if (args.city && args.city !== "any") {
        if (u.profile.city !== args.city) return false;
      }

      // Filter by country
      if (args.country && args.country !== "any") {
        if (u.profile.country !== args.country) return false;
      }

      // Filter by age
      if (args.ageMin || args.ageMax) {
        const dob = new Date(u.profile.dateOfBirth || "");
        if (isNaN(dob.getTime())) return false;

        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        if (args.ageMin && age < args.ageMin) return false;
        if (args.ageMax && age > args.ageMax) return false;
      }

      return true;
    });

    // Sort: boosted profiles first (boostedUntil in future), then by creation date desc
    const now = Date.now();
    filteredUsers.sort((a, b) => {
      const aBoost = a.profile?.boostedUntil && a.profile.boostedUntil > now;
      const bBoost = b.profile?.boostedUntil && b.profile.boostedUntil > now;

      if (aBoost && !bBoost) return -1;
      if (!aBoost && bBoost) return 1;

      const aTime = a.profile?.createdAt || 0;
      const bTime = b.profile?.createdAt || 0;
      return bTime - aTime;
    });

    // Apply pagination
    const page = args.page || 0;
    const pageSize = args.pageSize || 10;
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedUsers = filteredUsers.slice(start, end);

    // Map to public profile format
    const searchResults = paginatedUsers.map((u: any) => {
      const profile = u.profile!; // We know it's not null because of the filter
      return {
        userId: u._id,
        email: u.email,
        profile: {
          fullName: profile.fullName,
          city: profile.city,
          dateOfBirth: profile.dateOfBirth,
          isProfileComplete: profile.isProfileComplete,

          profileImageIds: profile.profileImageIds,
          profileImageUrls: profile.profileImageUrls,
          createdAt: profile.createdAt,
          boostedUntil: profile.boostedUntil,
        },
      };
    });

    return {
      profiles: searchResults,
      total: filteredUsers.length,
    };
  },
});

export const adminUpdateProfileImageOrder = mutation({
  args: {
    profileId: v.id("profiles"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { profileId, imageIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    await ctx.db.patch(profileId, { profileImageIds: imageIds });
    return { success: true };
  },
});

/***********************************
 * Premium Plus: Profile Boost
 ***********************************/
export const boostProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    if (profile.subscriptionPlan !== "premiumPlus") {
      throw new ConvexError("Profile Boost is only available for Premium Plus");
    }

    // Determine if we need to reset monthly quota. We store boostsMonth as a numeric key in
    // the form YYYYMM (e.g., 202406 for June 2024) so it plays nicely with the Convex
    // schema expecting `v.number()`.
    const now = new Date();
    const currentMonthKey =
      now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1); // 202406

    let boostsRemaining = profile.boostsRemaining as number | undefined;
    let boostsMonth = (profile as any).boostsMonth as number | undefined;

    if (boostsMonth !== currentMonthKey) {
      // New month → reset quota to 5
      boostsRemaining = 5;
      boostsMonth = currentMonthKey;
    }

    if ((boostsRemaining ?? 0) <= 0) {
      throw new ConvexError("No boosts remaining this month");
    }

    // Mark boostedUntil for 24 hours and decrement quota
    const updates: Partial<ConvexProfile> = {
      boostsRemaining: (boostsRemaining ?? 0) - 1,
      boostsMonth,
      boostedUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return { boostsRemaining: (boostsRemaining ?? 0) - 1 };
  },
});

/***********************************
 * Spotlight Badge Management
 ***********************************/

// Grant spotlight badge (Premium/Premium Plus users only)
export const grantSpotlightBadge = mutation({
  args: {
    durationDays: v.optional(v.number()), // Optional duration, defaults to 30 days
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    // Check if user has premium or premium plus subscription
    if (
      profile.subscriptionPlan !== "premium" &&
      profile.subscriptionPlan !== "premiumPlus"
    ) {
      throw new ConvexError(
        "Spotlight badge is only available for Premium and Premium Plus subscribers"
      );
    }

    // Calculate expiration (default 30 days)
    const durationDays = args.durationDays ?? 30;
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      durationDays,
    };
  },
});

// Remove spotlight badge
export const removeSpotlightBadge = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: false,
      spotlightBadgeExpiresAt: undefined,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return { hasSpotlightBadge: false };
  },
});

// Admin function to grant spotlight badge to any user
export const adminGrantSpotlightBadge = mutation({
  args: {
    profileId: v.id("profiles"),
    durationDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError("Profile not found");

    // Calculate expiration (default 30 days)
    const durationDays = args.durationDays ?? 30;
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.profileId, updates as any);

    return {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      durationDays,
    };
  },
});

// Admin function to remove spotlight badge from any user
export const adminRemoveSpotlightBadge = mutation({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError("Profile not found");

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: false,
      spotlightBadgeExpiresAt: undefined,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.profileId, updates as any);

    return { hasSpotlightBadge: false };
  },
});

/***********************************
 * Record Profile View
 ***********************************/
export const recordProfileView = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const viewer = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });
    if (!viewer) return;

    // Prevent logging self views
    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.userId === viewer._id) return;

    // Save simple record (allow duplicates, can be deduped in query)
    await ctx.db.insert("profileViews", {
      viewerId: viewer._id,
      profileId: args.profileId,
      createdAt: Date.now(),
    });
  },
});

/***********************************
 * Get viewers list (Premium Plus only)
 ***********************************/
export const getProfileViewers = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const viewerUser = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });
    if (!viewerUser) return [];

    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.userId !== viewerUser._id) return [];

    if (profile.subscriptionPlan !== "premiumPlus") return [];

    // Get recent views (last 100)
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_profileId_createdAt", (q) =>
        q.eq("profileId", args.profileId)
      )
      .order("desc")
      .take(100);

    const viewerIds = Array.from(new Set(views.map((v) => v.viewerId)));

    const users = await Promise.all(viewerIds.map((id) => ctx.db.get(id)));

    return users.filter(Boolean);
  },
});

// --- Stripe subscription helpers ---
export const internalUpdateSubscription = internalMutation(
  async (
    ctx,
    args: {
      email: string;
      plan: "free" | "premium" | "premiumPlus";
      expiresAt?: number;
    }
  ) => {
    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email,
    });
    if (!user) {
      console.error("internalUpdateSubscription: user not found", args.email);
      return;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) {
      console.error("internalUpdateSubscription: profile not found", user._id);
      return;
    }
    await ctx.db.patch(profile._id, {
      subscriptionPlan: args.plan,
      subscriptionExpiresAt: args.expiresAt ?? undefined,
    });
  }
);

export const stripeUpdateSubscription = action({
  args: {
    email: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("premium"),
      v.literal("premiumPlus")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.users.internalUpdateSubscription, {
      email: args.email,
      plan: args.plan,
      expiresAt: Date.now() + 31 * 24 * 60 * 60 * 1000, // extend 31 days
    });
  },
});

/**
 * Get the current refreshVersion for a user by id.
 */
export const getRefreshVersion = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return (user as User).refreshVersion ?? 0;
  },
});

/**
 * Increment and return the new refreshVersion for a user (rotation).
 */
export const incrementRefreshVersion = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const current = (user as User).refreshVersion ?? 0;
    const next = current + 1;
    await ctx.db.patch(userId, { refreshVersion: next });
    return next;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const lower = email.toLowerCase();
    const all = await ctx.db.query("users").collect();
    return (
      all.find(
        (u) => typeof u.email === "string" && u.email.toLowerCase() === lower
      ) || null
    );
  },
});
