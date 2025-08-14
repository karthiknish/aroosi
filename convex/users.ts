/* convex/users.ts
 * Convex user helpers referenced by actions via generated api
 * - Query: findUserByEmail (requires index "by_email" on users.email in your Convex schema)
 * - Mutation: createUserAndProfile
 * - Rate limiting helpers and other commonly used queries
 */
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Lightweight structured logger for Convex functions in this module
const LOG_SCOPE = "convex.users";
type LogDetails = Record<string, unknown>;

const logger = {
  info(event: string, details?: LogDetails) {
    /* eslint-disable-next-line no-console */
    console.info(`[${LOG_SCOPE}] ${event}`, details ?? {});
  },
  warn(event: string, details?: LogDetails) {
    /* eslint-disable-next-line no-console */
    console.warn(`[${LOG_SCOPE}] ${event}`, details ?? {});
  },
  error(event: string, details?: LogDetails) {
    /* eslint-disable-next-line no-console */
    console.error(`[${LOG_SCOPE}] ${event}`, details ?? {});
  },
  debug(event: string, details?: LogDetails) {
    /* eslint-disable-next-line no-console */
    console.debug(`[${LOG_SCOPE}] ${event}`, details ?? {});
  },
};

function maskEmail(e?: string) {
  if (!e) return "";
  const [name, domain] = e.split("@");
  const first = (name?.[0] ?? "*") + "***";
  return domain ? `${first}@${domain}` : first;
}

/**
 * Query helper: find user by email (uses index 'by_email' on users.email in your Convex schema)
 */
export const findUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const res = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    logger.info("findUserByEmail", {
      email: maskEmail(email),
      found: Boolean(res),
    });
    return res;
  },
});

/**
 * Query helper: find user by Clerk ID (uses index 'by_clerkId' on users.clerkId in your Convex schema)
 */
export const findUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const res = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    logger.info("findUserByClerkId", {
      clerkId: clerkId.substring(0, 10) + "...",
      found: Boolean(res),
    });
    return res;
  },
});

/**
 * Alias: getUserByClerkId -> delegates to findUserByClerkId
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const res = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    logger.info("getUserByClerkId", {
      clerkId: clerkId.substring(0, 10) + "...",
      found: Boolean(res),
    });
    return res;
  },
});

/**
 * Alias: getUserByEmail -> delegates to findUserByEmail
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const res = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    logger.info("getUserByEmail", {
      email: maskEmail(email),
      found: Boolean(res),
    });
    return res;
  },
});

/**
 * Mutation helper: create user and default profile
 */
export const createUserAndProfile = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    googleId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    profileData: v.optional(
      v.object({
        fullName: v.optional(v.string()),
        aboutMe: v.optional(v.string()),
        isProfileComplete: v.optional(v.boolean()),
        // IMPORTANT: gender was missing here which caused it to be stripped
        // from incoming profileData, making the requiredFilled guard fail.
        // Adding it to align with profiles schema and requiredFilled check.
        gender: v.optional(
          v.union(v.literal("male"), v.literal("female"), v.literal("other"))
        ),
        motherTongue: v.optional(v.string()),
        religion: v.optional(v.string()),
        ethnicity: v.optional(v.string()),
        hideFromFreeUsers: v.optional(v.boolean()),
        subscriptionPlan: v.optional(v.string()),
        subscriptionExpiresAt: v.optional(v.number()),
        profileImageIds: v.optional(v.array(v.id("_storage"))),
        profileImageUrls: v.optional(v.array(v.string())),
        city: v.optional(v.string()),
        country: v.optional(v.string()),
        height: v.optional(v.string()),
        maritalStatus: v.optional(v.string()),
        physicalStatus: v.optional(v.string()),
        diet: v.optional(v.string()),
        smoking: v.optional(v.string()),
        drinking: v.optional(v.string()),
        education: v.optional(v.string()),
        occupation: v.optional(v.string()),
        annualIncome: v.optional(v.number()),
        partnerPreferenceAgeMin: v.optional(v.union(v.number(), v.string())),
        partnerPreferenceAgeMax: v.optional(v.union(v.number(), v.string())),
        partnerPreferenceCity: v.optional(v.array(v.string())),
        preferredGender: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        email: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
      })
    ),
  },
  handler: async (
    ctx,
    { email, name: _name, picture: _picture, googleId, clerkId, profileData }
  ) => {
    logger.info("createUserAndProfile:start", {
      email: maskEmail(email),
      hasGoogleId: Boolean(googleId),
      hasClerkId: Boolean(clerkId),
      name: _name,
      picture: _picture,
      clerkId,
      googleId,
      profileData: profileData ?? null,
    });

    // Guard: Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      logger.warn("createUserAndProfile:blocked_duplicate_email", {
        email: maskEmail(email),
        existingUserId: String(existingUser._id),
        attemptedProfileData: profileData ?? null,
      });
      logger.error("createUserAndProfile:error", {
        error: "USER_WITH_EMAIL_EXISTS",
        email: maskEmail(email),
        existingUser,
      });
      throw new Error("USER_WITH_EMAIL_EXISTS");
    }

    // Guard: require a filled profile payload before creating any records
    const pd = (profileData ?? {}) as Partial<Doc<"profiles">>;
    logger.debug("createUserAndProfile:profileData", pd);
    const requiredFilled = Boolean(
      pd.fullName &&
        pd.dateOfBirth &&
        pd.gender &&
        pd.city &&
        pd.aboutMe &&
        pd.occupation &&
        pd.education &&
        pd.height &&
        pd.maritalStatus &&
        pd.phoneNumber
    );
    if (!requiredFilled) {
      logger.warn("createUserAndProfile:blocked_incomplete_profile", {
        email: maskEmail(email),
        hasProfileData: Boolean(profileData),
        missingFields: {
          fullName: !!pd.fullName,
          dateOfBirth: !!pd.dateOfBirth,
          gender: !!pd.gender,
          city: !!pd.city,
          aboutMe: !!pd.aboutMe,
          occupation: !!pd.occupation,
          education: !!pd.education,
          height: !!pd.height,
          maritalStatus: !!pd.maritalStatus,
          phoneNumber: !!pd.phoneNumber,
        },
        attemptedProfileData: pd,
      });
      logger.error("createUserAndProfile:error", {
        error: "INCOMPLETE_PROFILE",
        email: maskEmail(email),
        profileData: pd,
      });
      throw new Error("INCOMPLETE_PROFILE");
    }
    const userId: Id<"users"> = await ctx.db.insert("users", {
      email,
      role: "user",
      createdAt: Date.now(),
      emailVerified: true,
      googleId: googleId ?? undefined,
      clerkId: clerkId ?? undefined,
      // Note: additional fields like name/picture are not in the users schema; store only allowed fields
    });

    // Merge profileData with default values
    // Respect an explicit isProfileComplete=false from callers (e.g., webhook)
    const incomingCompleteFlag = pd.isProfileComplete;
    const resolvedComplete = incomingCompleteFlag === false ? false : true;
    // Coerce union-constrained fields explicitly to satisfy schema types
    const profileToCreate: Omit<Doc<"profiles">, "_id" | "_creationTime"> = {
      userId: userId,
      isProfileComplete: resolvedComplete,
      isOnboardingComplete: resolvedComplete,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(profileData as Partial<Doc<"profiles">> | undefined),
    };
    logger.debug("createUserAndProfile:profileToCreate", profileToCreate);
    // Narrow fields with union types
    if (
      profileToCreate.preferredGender &&
      !["any", "male", "female", "other"].includes(
        profileToCreate.preferredGender as string
      )
    ) {
      logger.warn("createUserAndProfile:invalid_preferredGender", {
        value: profileToCreate.preferredGender,
        userId: String(userId),
      });
      profileToCreate.preferredGender = undefined;
    }

    await ctx.db.insert("profiles", profileToCreate);
    logger.info("createUserAndProfile:done", {
      email: maskEmail(email),
      userId: String(userId),
      createdProfile: profileToCreate,
    });
    return userId as Id<"users">;
  },
});

/**
 * Update a user's hashed password directly by userId.
 * This is intended to be called from a trusted server route only.
 */
export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, { userId, hashedPassword }) => {
    await ctx.db.patch(userId as Id<"users">, { hashedPassword });
    logger.info("updateUserPassword", {
      userId: String(userId),
      hashed: typeof hashedPassword === "string",
    });
    return { ok: true } as const;
  },
});

/**
 * Public profile by userId
 * Requires profiles index "by_userId" (profiles.userId)
 */
export const getProfileByUserIdPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    // Return only public fields used by callers
    const {
      _id,
      isProfileComplete,
      isOnboardingComplete,
      createdAt,
      updatedAt,
    } = profile;
    return {
      _id,
      isProfileComplete: !!isProfileComplete,
      isOnboardingComplete: !!isOnboardingComplete,
      createdAt,
      updatedAt,
    };
  },
});

/**
 * Fetch a profile by its profile _id, returning the owning userId if found.
 * Note: a more detailed admin-oriented `getProfileById` exists later; keep this
 * lightweight variant for general callers to avoid leaking private fields.
 */
export const getProfileOwnerById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    const profile = await ctx.db.get(id);
    if (!profile) return null;
    return {
      _id: profile._id as Id<"profiles">,
      userId: profile.userId as Id<"users">,
    } as const;
  },
});

/**
 * Current user with public profile, resolved via Convex Auth cookie session.
 * Uses ctx.auth.getUserIdentity() to derive the authenticated identity, then
 * looks up the user by email and returns a minimal shape along with profile.
 */
export const getCurrentUserWithProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = (identity as { email?: string } | null)?.email as
      | string
      | undefined;
    let user: Doc<"users"> | null = null;
    if (email && email.trim()) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email.trim()))
        .first();
    }

    if (!user) return null;

    let profile: Doc<"profiles"> | null = null;
    try {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id as Id<"users">))
        .first();
    } catch {
      profile = null;
    }

    return { user, profile } as const;
  },
});

/**
 * List current user's matches using cookie/session auth (Convex Auth).
 * Returns minimal info needed by callers:
 * [{ userId, fullName?, profileImageUrls?, createdAt? }]
 */
export const getMyMatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return [] as Array<{
        userId: Id<"users">;
        fullName?: string | null;
        profileImageUrls?: string[] | null;
        createdAt?: number | null;
      }>;

    // Resolve current user record via email
    const email = (identity as { email?: string } | null)?.email as
      | string
      | undefined;
    let me: any = null;
    if (email && email.trim()) {
      me = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email.trim()))
        .first();
    }
    if (!me) return [];

    const myId = me._id as Id<"users">;

    // Collect matches where I'm either user1 or user2
    const asUser1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", myId))
      .collect();
    const asUser2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", myId))
      .collect();

    const rows = [...asUser1, ...asUser2].filter(
      (m: any) => m?.status === "matched"
    );

    // Map to the other participant and enrich with profile basics
    const results: Array<{
      userId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt?: number | null;
    }> = [];

    for (const m of rows) {
      const otherUserId = (
        m.user1Id === myId ? m.user2Id : m.user1Id
      ) as Id<"users">;
      let fullName: string | null = null;
      let profileImageUrls: string[] | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();
        if (profile) {
          fullName = (profile as Doc<"profiles">).fullName ?? null;
          profileImageUrls =
            (profile as Doc<"profiles">).profileImageUrls ?? null;
        }
      } catch {}

      results.push({
        userId: otherUserId,
        fullName,
        profileImageUrls,
        createdAt: (m as any)?.createdAt ?? null,
      });
    }

    return results;
  },
});

/**
 * Record a profile view by the current authenticated user.
 */
export const recordProfileView = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const email = (identity as { email?: string } | null)?.email as
      | string
      | undefined;
    if (!email) throw new Error("Unauthenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!me) throw new Error("User not found");
    await ctx.db.insert("profileViews", {
      viewerId: me._id as Id<"users">,
      profileId,
      createdAt: Date.now(),
    });
    return { success: true } as const;
  },
});

/**
 * Get viewers for a profile. Caller should be authorized by route logic; this
 * query does not enforce ownership beyond Convex authentication.
 */
export const getProfileViewers = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_profileId_createdAt", (q) => q.eq("profileId", profileId))
      .collect();
    const results: Array<{
      viewerId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      viewedAt: number;
    }> = [];
    for (const vrow of views) {
      const viewerId = vrow.viewerId as Id<"users">;
      let fullName: string | null = null;
      let profileImageUrls: string[] | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", viewerId))
          .first();
        if (profile) {
          fullName = (profile as Doc<"profiles">).fullName ?? null;
          profileImageUrls =
            (profile as Doc<"profiles">).profileImageUrls ?? null;
        }
      } catch {}
      results.push({
        viewerId,
        fullName,
        profileImageUrls,
        viewedAt: vrow.createdAt ?? Date.now(),
      });
    }
    return results;
  },
});

/**
 * Boost the current user's profile for 24 hours.
 * Enforces Premium Plus subscription and a monthly quota.
 */
export const boostProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Sign in required",
      } as const;
    }

    const email = (identity as { email?: string } | null)?.email as
      | string
      | undefined;
    if (!email) {
      return {
        success: false,
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Missing identity email",
      } as const;
    }

    // Resolve user and profile
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) {
      return {
        success: false,
        status: 404,
        code: "USER_NOT_FOUND",
        message: "User not found",
      } as const;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id as Id<"users">))
      .first();
    if (!profile) {
      return {
        success: false,
        status: 404,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found",
      } as const;
    }

    const now = Date.now();
    const currentMonthKey =
      new Date(now).getUTCFullYear() * 100 + (new Date(now).getUTCMonth() + 1);
    const monthlyQuota = 5;

    const plan = (profile as Doc<"profiles">).subscriptionPlan as
      | string
      | undefined;
    const expiresAt = (profile as Doc<"profiles">).subscriptionExpiresAt as
      | number
      | undefined;
    if (
      plan !== "premiumPlus" ||
      (typeof expiresAt === "number" && expiresAt <= now)
    ) {
      return {
        success: false,
        status: 402,
        code: "REQUIRES_PREMIUM_PLUS",
        message: "Upgrade to Premium Plus to boost your profile",
      } as const;
    }

    const boostedUntil = (profile as Doc<"profiles">).boostedUntil as
      | number
      | undefined;
    if (typeof boostedUntil === "number" && boostedUntil > now) {
      return {
        success: false,
        status: 200,
        code: "ALREADY_BOOSTED",
        message: "Your profile is already boosted",
        boostedUntil,
        boostsRemaining: (profile as Doc<"profiles">).boostsRemaining ?? 0,
      } as const;
    }

    let boostsMonth = (profile as Doc<"profiles">).boostsMonth as
      | number
      | undefined;
    let boostsRemaining = (profile as Doc<"profiles">).boostsRemaining as
      | number
      | undefined;
    if (boostsMonth !== currentMonthKey) {
      boostsMonth = currentMonthKey;
      boostsRemaining = monthlyQuota;
    }
    if ((boostsRemaining ?? 0) <= 0) {
      return {
        success: false,
        status: 429,
        code: "NO_BOOSTS_LEFT",
        message: "No boosts remaining this month",
        boostsRemaining: boostsRemaining ?? 0,
      } as const;
    }

    const newBoostedUntil = now + 24 * 60 * 60 * 1000;
    const newRemaining = Math.max((boostsRemaining ?? monthlyQuota) - 1, 0);

    await ctx.db.patch(profile._id as Id<"profiles">, {
      boostedUntil: newBoostedUntil,
      boostsRemaining: newRemaining,
      boostsMonth: currentMonthKey,
      updatedAt: now,
    });

    return {
      success: true,
      status: 200,
      code: "BOOST_APPLIED",
      boostedUntil: newBoostedUntil,
      boostsRemaining: newRemaining,
      message: "Profile boosted for 24 hours",
    } as const;
  },
});

/**
 * Update current user's profile with provided fields.
 */
export const updateProfile = mutation({
  args: {
    updates: v.object({
      fullName: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      isProfileComplete: v.optional(v.boolean()),
      motherTongue: v.optional(v.string()),
      religion: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      hideFromFreeUsers: v.optional(v.boolean()),
      subscriptionPlan: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      profileImageUrls: v.optional(v.array(v.string())),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(v.string()),
      physicalStatus: v.optional(v.string()),
      diet: v.optional(v.string()),
      smoking: v.optional(v.string()),
      drinking: v.optional(v.string()),
      education: v.optional(v.string()),
      occupation: v.optional(v.string()),
      annualIncome: v.optional(v.number()),
      partnerPreferenceAgeMin: v.optional(v.union(v.number(), v.string())),
      partnerPreferenceAgeMax: v.optional(v.union(v.number(), v.string())),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      preferredGender: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, status: 401, code: "UNAUTHENTICATED" } as const;
    }
    const email = (identity as { email?: string } | null)?.email as
      | string
      | undefined;
    if (!email) {
      return { success: false, status: 401, code: "UNAUTHENTICATED" } as const;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) {
      return { success: false, status: 404, code: "USER_NOT_FOUND" } as const;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id as Id<"users">))
      .first();
    if (!profile) {
      return {
        success: false,
        status: 404,
        code: "PROFILE_NOT_FOUND",
      } as const;
    }
    const patch = { ...updates, updatedAt: Date.now() } as Partial<
      Doc<"profiles">
    > & { updatedAt: number };
    await ctx.db.patch(profile._id as Id<"profiles">, patch as any);
    const updated = await ctx.db.get(profile._id as Id<"profiles">);
    return { success: true, profile: updated } as const;
  },
});

/**
 * Admin: list profiles with simple filtering and pagination (naive scan).
 */
export const adminListProfiles = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDir: v.optional(v.string()),
    banned: v.optional(v.string()),
    plan: v.optional(v.string()),
    isProfileComplete: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("profiles").collect();
    let profiles = all as Array<Doc<"profiles">>;
    const term = (args.search ?? "").toLowerCase().trim();
    if (term) {
      profiles = profiles.filter(
        (p) =>
          String(p.fullName ?? "")
            .toLowerCase()
            .includes(term) ||
          String(p.aboutMe ?? "")
            .toLowerCase()
            .includes(term)
      );
    }
    // Enrich banned flag by joining users
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId as Id<"users">);
        return {
          ...p,
          banned: Boolean((user as Doc<"users">)?.banned),
        } as Doc<"profiles"> & { banned: boolean };
      })
    );
    let filtered = enriched;
    if (args.banned === "true")
      filtered = filtered.filter((p) => p.banned === true);
    if (args.banned === "false")
      filtered = filtered.filter((p) => p.banned !== true);
    if (args.isProfileComplete === "true")
      filtered = filtered.filter((p) => p.isProfileComplete === true);
    if (args.isProfileComplete === "false")
      filtered = filtered.filter((p) => p.isProfileComplete !== true);
    // simple sort by createdAt or subscriptionPlan or banned
    const sortBy =
      (args.sortBy as "createdAt" | "updatedAt" | "banned") || "createdAt";
    const dir = (args.sortDir as string) === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a?.[sortBy] ?? 0;
      const bv = b?.[sortBy] ?? 0;
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
    const pageSize = Math.min(Math.max(args.pageSize ?? 10, 1), 100);
    const page = Math.max(args.page ?? 1, 1);
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    return {
      profiles: pageItems,
      total: filtered.length,
      page,
      pageSize,
    } as const;
  },
});

/**
 * Admin: get profile by id (public fields).
 */
export const getProfileById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Admin: update profile by id with a whitelist of fields.
 */
export const adminUpdateProfile = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      fullName: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      isProfileComplete: v.optional(v.boolean()),
      motherTongue: v.optional(v.string()),
      religion: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      hideFromFreeUsers: v.optional(v.boolean()),
      subscriptionPlan: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(
      id as Id<"profiles">,
      {
        ...(updates as Record<string, unknown>),
        updatedAt: Date.now(),
      } as any
    );
    return { ok: true } as const;
  },
});

/**
 * Admin: update spotlight badge status and expiration for a profile.
 */
export const adminUpdateSpotlightBadge = mutation({
  args: {
    profileId: v.id("profiles"),
    hasSpotlightBadge: v.boolean(),
    durationDays: v.optional(v.number()),
  },
  handler: async (ctx, { profileId, hasSpotlightBadge, durationDays }) => {
    let expiresAt: number | undefined = undefined;
    if (hasSpotlightBadge) {
      const days = Number.isFinite(durationDays)
        ? (durationDays as number)
        : 30;
      expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    }
    await ctx.db.patch(
      profileId as Id<"profiles">,
      {
        hasSpotlightBadge,
        spotlightBadgeExpiresAt: expiresAt,
        updatedAt: Date.now(),
      } as any
    );
    return { hasSpotlightBadge, spotlightBadgeExpiresAt: expiresAt } as const;
  },
});

/**
 * Admin: delete a profile by id.
 */
export const deleteProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return { ok: true, deleted: false } as const;
    await ctx.db.delete(id);
    return { ok: true, deleted: true } as const;
  },
});

/**
 * Admin: reorder profile image ids.
 */
export const adminUpdateProfileImageOrder = mutation({
  args: {
    profileId: v.id("profiles"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { profileId, imageIds }) => {
    await ctx.db.patch(
      profileId as Id<"profiles">,
      {
        profileImageIds: imageIds,
        updatedAt: Date.now(),
      } as any
    );
    return { ok: true } as const;
  },
});

/**
 * Admin: ban/unban a user by userId.
 */
export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId as Id<"users">, { banned: true } as any);
    return { ok: true } as const;
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId as Id<"users">, { banned: false } as any);
    return { ok: true } as const;
  },
});

/**
 * Admin: get matches for a profile by profileId.
 */
export const getMatchesForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return [] as any[];
    const userId = (profile as any).userId as Id<"users">;
    const a = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", userId))
      .collect();
    const b = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", userId))
      .collect();
    return [...a, ...b];
  },
});

/**
 * Public profile search with filter support and pagination.
 * NOTE: Filtering uses one indexed query when possible, then refines in memory.
 */
export const searchPublicProfiles = query({
  args: {
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    motherTongue: v.optional(v.string()),
    language: v.optional(v.string()), // not currently stored; accepted and ignored
    preferredGender: v.optional(
      v.union(
        v.literal("any"),
        v.literal("male"),
        v.literal("female"),
        v.literal("other")
      )
    ),
    ageMin: v.optional(v.number()),
    ageMax: v.optional(v.number()),
    page: v.number(),
    pageSize: v.number(),
    viewerUserId: v.optional(v.id("users")),
    correlationId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      city,
      country,
      ethnicity,
      motherTongue,
      // language,
      preferredGender,
      ageMin,
      ageMax,
      page,
      pageSize,
      viewerUserId,
    }
  ) => {
    const safePage = Math.max(0, page ?? 0);
    const safeSize = Math.min(Math.max(pageSize ?? 12, 1), 50);

    // Choose a primary index and collect rows (avoid type mismatches between QueryInitializer and Query)
    let all: any[] = [];
    if (country) {
      all =
        (await ctx.db
          .query("profiles")
          .withIndex("by_country", (ix) => ix.eq("country", country))
          .collect?.()) ?? [];
    } else if (city) {
      all =
        (await ctx.db
          .query("profiles")
          .withIndex("by_city", (ix) => ix.eq("city", city))
          .collect?.()) ?? [];
    } else if (ethnicity) {
      all =
        (await ctx.db
          .query("profiles")
          // Cast value to schema union type at compile time
          .withIndex("by_ethnicity", (ix) =>
            ix.eq("ethnicity", ethnicity as any)
          )
          .collect?.()) ?? [];
    } else if (motherTongue) {
      all =
        (await ctx.db
          .query("profiles")
          .withIndex("by_motherTongue", (ix) =>
            ix.eq("motherTongue", motherTongue as any)
          )
          .collect?.()) ?? [];
    } else {
      all =
        (await ctx.db
          .query("profiles")
          .withIndex("by_createdAt")
          .collect?.()) ?? [];
    }

    // Resolve block lists for viewer and filter in memory
    const blockedUserIds = new Set<string>();
    if (viewerUserId) {
      const blocked = await ctx.db
        .query("blocks")
        .withIndex("by_blocker", (ix) => ix.eq("blockerUserId", viewerUserId))
        .collect();
      const blockedBy = await ctx.db
        .query("blocks")
        .withIndex("by_blocked", (ix) => ix.eq("blockedUserId", viewerUserId))
        .collect();
      for (const b of blocked as any[])
        blockedUserIds.add(String(b.blockedUserId));
      for (const b of blockedBy as any[])
        blockedUserIds.add(String(b.blockerUserId));
    }

    // Filter in memory for remaining predicates
    const filtered = (all as any[]).filter((p) => {
      if (!p) return false;
      if (!p.isProfileComplete) return false;
      if (p.banned) return false;

      if (viewerUserId && blockedUserIds.size > 0) {
        if (blockedUserIds.has(String(p.userId))) return false;
      }

      // Optional city/country refinement when primary index differs
      if (country && p.country !== country) return false;
      if (city && p.city !== city) return false;

      if (preferredGender && preferredGender !== "any") {
        if (p.gender !== preferredGender) return false;
      }

      if (ethnicity && p.ethnicity !== ethnicity) return false;
      if (motherTongue && p.motherTongue !== motherTongue) return false;

      // Age calculation from dateOfBirth (stored as string ISO or yyyy-mm-dd)
      if (
        (ageMin !== undefined && ageMin !== null) ||
        (ageMax !== undefined && ageMax !== null)
      ) {
        const dobStr = p.dateOfBirth as string | undefined;
        if (!dobStr) return false;
        const dob = new Date(dobStr);
        if (Number.isNaN(dob.getTime())) return false;
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        );
        if (ageMin !== undefined && ageMin !== null && age < ageMin)
          return false;
        if (ageMax !== undefined && ageMax !== null && age > ageMax)
          return false;
      }

      return true;
    });

    const total = filtered.length;
    const start = safePage * safeSize;
    const pageItems = filtered.slice(start, start + safeSize);

    // Map to client shape; include minimal profile fields required by UI
    const profiles = await Promise.all(
      pageItems.map(async (p: any) => {
        const u = await ctx.db.get(p.userId as Id<"users">);
        return {
          userId: String(p.userId),
          email: (u as any)?.email,
          profile: {
            fullName: p.fullName,
            city: p.city,
            dateOfBirth: p.dateOfBirth,
            isProfileComplete: !!p.isProfileComplete,
            hiddenFromSearch: !!p.hiddenFromSearch,
            boostedUntil: p.boostedUntil,
            subscriptionPlan: p.subscriptionPlan,
            hideFromFreeUsers: !!p.hideFromFreeUsers,
            profileImageUrls: Array.isArray(p.profileImageUrls)
              ? p.profileImageUrls
              : [],
            hasSpotlightBadge: !!p.hasSpotlightBadge,
            spotlightBadgeExpiresAt: p.spotlightBadgeExpiresAt,
          },
        } as any;
      })
    );

    return {
      profiles,
      total,
      page: safePage,
      pageSize: safeSize,
    } as any;
  },
});

/**
 * Rate limiting helpers
 * Requires rateLimits table with index "by_key" on key
 * rateLimits: { key: string, windowStart: number, count: number }
 */
export const getRateLimitByKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const res = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    logger.info("getRateLimitByKey", {
      key,
      found: Boolean(res),
    });
    return res;
  },
});

export const setRateLimitWindow = mutation({
  args: {
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  },
  handler: async (ctx, { key, windowStart, count }) => {
    // Store values as bigint to match table schema types
    const windowStartBig = BigInt(windowStart);
    const countBig = BigInt(count);

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(
        existing._id as Id<"rateLimits">,
        {
          windowStart: windowStartBig,
          count: countBig,
        } as any
      );
      logger.info("setRateLimitWindow:update", {
        key,
        windowStart,
        count,
      });
      return existing._id as Id<"rateLimits">;
    }

    const id = await ctx.db.insert("rateLimits", {
      key,
      windowStart: windowStartBig,
      count: countBig,
    } as any);
    logger.info("setRateLimitWindow:insert", {
      key,
      windowStart,
      count,
    });
    return id as Id<"rateLimits">;
  },
});

export const incrementRateLimit = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!existing) {
      const id = await ctx.db.insert("rateLimits", {
        key,
        windowStart: BigInt(Date.now()),
        count: BigInt(1),
      } as any);
      logger.info("incrementRateLimit:insert", { key });
      return id as Id<"rateLimits">;
    }
    const currentCount = (existing as any).count ?? BigInt(0);
    await ctx.db.patch(
      existing._id as Id<"rateLimits">,
      {
        count:
          (typeof currentCount === "bigint"
            ? currentCount
            : BigInt(Number(currentCount))) + BigInt(1),
      } as any
    );
    logger.info("incrementRateLimit:update", { key });
    return existing._id as Id<"rateLimits">;
  },
});

/**
 * Signup wrapper in case callers expect an action-level function
 */
export const createUserAndProfileViaSignup = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    googleId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    profileData: v.optional(
      v.object({
        fullName: v.optional(v.string()),
        aboutMe: v.optional(v.string()),
        isProfileComplete: v.optional(v.boolean()),
        gender: v.optional(
          v.union(v.literal("male"), v.literal("female"), v.literal("other"))
        ),
        motherTongue: v.optional(v.string()),
        religion: v.optional(v.string()),
        ethnicity: v.optional(v.string()),
        hideFromFreeUsers: v.optional(v.boolean()),
        subscriptionPlan: v.optional(v.string()),
        subscriptionExpiresAt: v.optional(v.number()),
        profileImageIds: v.optional(v.array(v.id("_storage"))),
        profileImageUrls: v.optional(v.array(v.string())),
        city: v.optional(v.string()),
        country: v.optional(v.string()),
        height: v.optional(v.string()),
        maritalStatus: v.optional(v.string()),
        physicalStatus: v.optional(v.string()),
        diet: v.optional(v.string()),
        smoking: v.optional(v.string()),
        drinking: v.optional(v.string()),
        education: v.optional(v.string()),
        occupation: v.optional(v.string()),
        annualIncome: v.optional(v.number()),
        partnerPreferenceAgeMin: v.optional(v.union(v.number(), v.string())),
        partnerPreferenceAgeMax: v.optional(v.union(v.number(), v.string())),
        partnerPreferenceCity: v.optional(v.array(v.string())),
        preferredGender: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        email: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
      })
    ),
    // Note: hashedPassword intentionally excluded (handled by Clerk)
  },
  handler: async (
    ctx,
    { email, name, picture, googleId, clerkId, profileData }
  ) => {
    // Use registered functions via runQuery/runMutation; avoid ctx.db in action to keep types consistent
    const one = await ctx.runQuery(findUserByEmail as any, { email });
    if (one) {
      return { ok: true, userId: one._id as Id<"users"> };
    }
    const userId = await ctx.runMutation(createUserAndProfile as any, {
      email,
      name,
      picture,
      googleId,
      clerkId,
      profileData,
    });
    return { ok: true, userId: userId as Id<"users"> };
  },
});

/**
 * Update a user's subscription by email (webhook-safe: no ctx.auth required).
 * Patches the user's profile with plan and optional expiration.
 */
export const setSubscriptionByEmail = mutation({
  args: {
    email: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("premium"),
      v.literal("premiumPlus")
    ),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { email, plan, subscriptionExpiresAt }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) {
      return { ok: false, status: 404, code: "USER_NOT_FOUND" } as const;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id as Id<"users">))
      .first();
    if (!profile) {
      return { ok: false, status: 404, code: "PROFILE_NOT_FOUND" } as const;
    }
    const patch: any = { subscriptionPlan: plan, updatedAt: Date.now() };
    if (typeof subscriptionExpiresAt === "number") {
      patch.subscriptionExpiresAt = subscriptionExpiresAt;
    }
    await ctx.db.patch((profile as any)._id as Id<"profiles">, patch);
    return { ok: true } as const;
  },
});
