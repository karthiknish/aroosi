import { NextRequest } from "next/server";
import { Notifications } from "@/lib/notify";
import {
  validateProfileData,
  sanitizeProfileInput,
} from "@/lib/utils/profileValidation";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

// Helper to make handlers tolerant to test request objects (e.g. node-mocks-http)
async function parseJsonBody(req: any): Promise<any> {
  try {
    if (typeof req.json === "function") {
      return await req.json();
    }
  } catch {
    // fall through to alternative strategies
  }
  // Direct body object (common in test mocks)
  if (req && typeof req.body === "object" && req.body !== null) return req.body;
  if (req && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      // ignore
    }
  }
  // node-mocks-http style helpers
  if (typeof req._getJSON === "function") {
    try {
      return req._getJSON();
    } catch {
      /* noop */
    }
  }
  if (typeof req._getJSONData === "function") {
    try {
      return req._getJSONData();
    } catch {
      /* noop */
    }
  }
  throw new Error("Invalid JSON body");
}

function isProfileWithEmail(
  profile: unknown
): profile is import("@/types/profile").Profile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    typeof (profile as { email?: unknown }).email === "string"
  );
}

export const GET = withFirebaseAuth(async (user: any, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const userId = user.id;
  const rl = checkApiRateLimit(`profile_get_${userId}`, 50, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", correlationId }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) {
      return new Response(
        JSON.stringify({ error: "User profile not found", correlationId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const profile = { _id: doc.id, ...(doc.data() as any) };
    console.info("Profile GET success", {
      scope: "profile.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ profile, correlationId, success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Profile GET firebase error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to process profile request",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const PUT = withFirebaseAuth(async (user: any, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const userId = user.id;
  const rl = checkApiRateLimit(`profile_update_${userId}`, 20, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", correlationId }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    let body: any;
    try {
      body = await parseJsonBody(request);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", correlationId }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!body || typeof body !== "object")
      return new Response(
        JSON.stringify({ error: "Missing or invalid body", correlationId }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const sanitizedBody = sanitizeProfileInput(body);
    const ALLOWED_UPDATE_FIELDS = [
      "fullName",
      "dateOfBirth",
      "gender",
      "city",
      "country",
      "aboutMe",
      "religion",
      "motherTongue",
      "ethnicity",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "smoking",
      "drinking",
      "diet",
      "physicalStatus",
      "profileImageIds",
      "isProfileComplete",
      "phoneNumber",
      "annualIncome",
      "partnerPreferenceAgeMin",
      "partnerPreferenceAgeMax",
      "partnerPreferenceCity",
      "preferredGender",
      "profileFor",
      "hideFromFreeUsers",
    ] as const;
    const updates = Object.fromEntries(
      Object.entries(sanitizedBody).filter(([k]) =>
        (ALLOWED_UPDATE_FIELDS as readonly string[]).includes(k)
      )
    );
    if (Object.keys(updates).length === 0)
      return new Response(
        JSON.stringify({
          error: "No valid profile fields provided.",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const validation = validateProfileData(updates as any);
    if (!validation.isValid)
      return new Response(
        JSON.stringify({
          error: validation.error || "Invalid profile data",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists)
      return new Response(
        JSON.stringify({ error: "User profile not found", correlationId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    await db
      .collection("users")
      .doc(userId)
      .set({ ...updates, updatedAt: Date.now() }, { merge: true });
    const updated = await db.collection("users").doc(userId).get();
    const updatedProfile = { _id: updated.id, ...(updated.data() as any) };
    if (isProfileWithEmail(updatedProfile)) {
      try {
        await Notifications.profileCreated(
          updatedProfile.email,
          updatedProfile
        );
        await Notifications.profileCreatedAdmin(updatedProfile);
      } catch (e) {
        console.error("Profile PUT notification error", {
          message: e instanceof Error ? e.message : String(e),
          correlationId,
        });
      }
    }
    console.info("Profile PUT success", {
      scope: "profile.update",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({
        profile: updatedProfile,
        message: "Profile updated successfully",
        correlationId,
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Profile PUT firebase error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId,
    });
    return new Response(
      JSON.stringify({ error: "Internal server error", correlationId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const POST = withFirebaseAuth(async (user: any, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = user.id;
    const rateLimitResult = checkApiRateLimit(
      `profile_create_${userId}`,
      3,
      60000
    );
    if (!rateLimitResult.allowed)
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", correlationId }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    let body: Record<string, unknown>;
    try {
      body = await parseJsonBody(req);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", correlationId }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!body || typeof body !== "object")
      return new Response(
        JSON.stringify({ error: "Missing or invalid body", correlationId }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const sanitizedBody = sanitizeProfileInput(body);
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "preferredGender",
      "city",
      "aboutMe",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "phoneNumber",
    ];
    for (const field of requiredFields) {
      if (!sanitizedBody[field] || typeof sanitizedBody[field] !== "string") {
        return new Response(
          JSON.stringify({
            error: `Missing or invalid required field: ${field}`,
            correlationId,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    const validation = validateProfileData(sanitizedBody);
    if (!validation.isValid)
      return new Response(
        JSON.stringify({
          error: validation.error || "Invalid profile data",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const existingProfile = await db.collection("users").doc(userId).get();
    if (existingProfile.exists)
      return new Response(
        JSON.stringify({ error: "Profile already exists", correlationId }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );

    const filteredImageIds = Array.isArray(sanitizedBody.profileImageIds)
      ? (sanitizedBody.profileImageIds as string[]).filter(
          (id) => typeof id === "string" && !id.startsWith("local-")
        )
      : undefined;

    const profileData = {
      fullName: String(sanitizedBody.fullName || ""),
      dateOfBirth: String(sanitizedBody.dateOfBirth || ""),
      gender: sanitizedBody.gender as "male" | "female" | "other",
      city: String(sanitizedBody.city || ""),
      aboutMe: String(sanitizedBody.aboutMe || ""),
      profileFor:
        (sanitizedBody.profileFor as
          | "self"
          | "son"
          | "daughter"
          | "brother"
          | "sister"
          | "friend"
          | "relative"
          | "") ?? "self",
      preferredGender:
        (sanitizedBody.preferredGender as
          | "male"
          | "female"
          | "other"
          | "any") ?? "any",
      country: sanitizedBody.country
        ? String(sanitizedBody.country)
        : undefined,
      height: String(sanitizedBody.height || ""),
      maritalStatus:
        (sanitizedBody.maritalStatus as
          | "single"
          | "divorced"
          | "widowed"
          | "annulled") ?? "single",
      physicalStatus:
        (sanitizedBody.physicalStatus as "normal" | "differently-abled" | "") ??
        "",
      diet:
        (sanitizedBody.diet as
          | "vegetarian"
          | "non-vegetarian"
          | "halal"
          | "vegan"
          | "eggetarian"
          | "other"
          | "") ?? "",
      smoking:
        (sanitizedBody.smoking as "no" | "occasionally" | "yes" | "") ?? "no",
      drinking:
        (sanitizedBody.drinking as "no" | "occasionally" | "yes") ?? "no",
      motherTongue:
        (sanitizedBody.motherTongue as
          | "farsi-dari"
          | "pashto"
          | "uzbeki"
          | "hazaragi"
          | "turkmeni"
          | "balochi"
          | "nuristani"
          | "punjabi"
          | "") ?? "",
      religion:
        (sanitizedBody.religion as "muslim" | "hindu" | "sikh" | "") ?? "",
      ethnicity:
        (sanitizedBody.ethnicity as
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
          | "") ?? "",
      education: String(sanitizedBody.education || ""),
      occupation: String(sanitizedBody.occupation || ""),
      annualIncome:
        sanitizedBody.annualIncome === undefined ||
        sanitizedBody.annualIncome === ""
          ? undefined
          : String(sanitizedBody.annualIncome),
      phoneNumber: sanitizedBody.phoneNumber
        ? String(sanitizedBody.phoneNumber)
        : undefined,
      email: sanitizedBody.email ? String(sanitizedBody.email) : undefined,
      partnerPreferenceAgeMin:
        sanitizedBody.partnerPreferenceAgeMin !== undefined &&
        sanitizedBody.partnerPreferenceAgeMin !== ""
          ? Number(sanitizedBody.partnerPreferenceAgeMin)
          : undefined,
      partnerPreferenceAgeMax:
        sanitizedBody.partnerPreferenceAgeMax !== undefined &&
        sanitizedBody.partnerPreferenceAgeMax !== ""
          ? Number(sanitizedBody.partnerPreferenceAgeMax)
          : undefined,
      partnerPreferenceCity: Array.isArray(sanitizedBody.partnerPreferenceCity)
        ? (sanitizedBody.partnerPreferenceCity as string[])
        : sanitizedBody.partnerPreferenceCity
          ? [String(sanitizedBody.partnerPreferenceCity)]
          : undefined,
      profileImageIds: filteredImageIds,
      subscriptionPlan:
        (sanitizedBody.subscriptionPlan as
          | "free"
          | "premium"
          | "premiumPlus") ?? undefined,
      isProfileComplete: true,
    };

    // Use generated mutation present in API: users.createUserAndProfile
    // Filter to Convex-validated profileData keys to avoid validator errors
    const allowedKeys = new Set([
      "fullName",
      "aboutMe",
      "isProfileComplete",
      "motherTongue",
      "religion",
      "ethnicity",
      "hideFromFreeUsers",
      "subscriptionPlan",
      "subscriptionExpiresAt",
      "profileImageIds",
      "profileImageUrls",
      "city",
      "country",
      "height",
      "maritalStatus",
      "physicalStatus",
      "diet",
      "smoking",
      "drinking",
      "education",
      "occupation",
      "annualIncome",
      "partnerPreferenceAgeMin",
      "partnerPreferenceAgeMax",
      "partnerPreferenceCity",
      "preferredGender",
      "phoneNumber",
      "email",
      "dateOfBirth",
    ] as const);
    const convexProfileData = Object.fromEntries(
      Object.entries(profileData).filter(([k]) => allowedKeys.has(k as any))
    );

    const now = Date.now();
    const newProfileData = {
      ...convexProfileData,
      createdAt: now,
      updatedAt: now,
      userId,
      email: profileData.email,
      isOnboardingComplete: true,
    } as any;
    await db
      .collection("users")
      .doc(userId)
      .set(newProfileData, { merge: true });
    const newProfileSnap = await db.collection("users").doc(userId).get();
    const newProfile = {
      _id: newProfileSnap.id,
      ...(newProfileSnap.data() as any),
    };
    if (isProfileWithEmail(newProfile)) {
      try {
        await Notifications.profileCreated(newProfile.email, newProfile);
        await Notifications.profileCreatedAdmin(newProfile);
      } catch (e) {
        console.error("Profile POST notification error", {
          scope: "profile.create",
          type: "notify_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
        });
      }
    }
    const response = new Response(
      JSON.stringify({
        profile: newProfile,
        message: "Profile created successfully",
        correlationId,
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    console.info("Profile POST success", {
      scope: "profile.create",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile POST unhandled error", {
      scope: "profile.create",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ error: "Internal server error", correlationId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const DELETE = withFirebaseAuth(async (user: any, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = user.id;
    const rateLimitResult = checkApiRateLimit(
      `profile_delete_${userId}`,
      1,
      60000
    );
    if (!rateLimitResult.allowed)
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", correlationId }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists)
      return new Response(
        JSON.stringify({
          error: "No user or profile found for deletion",
          correlationId,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    await db.collection("users").doc(userId).delete();
    const response = new Response(
      JSON.stringify({
        message: "User and profile deleted successfully",
        correlationId,
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    console.info("Profile DELETE success", {
      scope: "profile.delete",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile DELETE unhandled error", {
      scope: "profile.delete",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to delete user and profile",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
