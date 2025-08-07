import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Notifications } from "@/lib/notify";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import {
  validateProfileData,
  sanitizeProfileInput,
} from "@/lib/utils/profileValidation";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { fetchQuery, fetchMutation } from "convex/nextjs";

function isProfileWithEmail(
  profile: unknown
): profile is import("@/types/profile").Profile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    typeof (profile as { email?: unknown }).email === "string"
  );
}

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(request);
    if (!userId) {
      console.warn("Profile GET missing userId", {
        scope: "profile.get",
        type: "missing_user",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ error: "User ID not found in token", correlationId }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const rateLimitResult = checkApiRateLimit(
      `profile_get_${userId}`,
      50,
      60000
    );
    if (!rateLimitResult.allowed) {
      console.warn("Profile GET rate limit exceeded", {
        scope: "profile.get",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", correlationId }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable", correlationId }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    const profile = await fetchQuery(
      api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> } as any
    ).catch((e: unknown) => {
        console.error("Profile GET query error", {
          scope: "profile.get",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });
    if (!profile) {
      console.warn("Profile GET not found", {
        scope: "profile.get",
        type: "profile_not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ error: "User profile not found", correlationId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const response = new Response(
      JSON.stringify({ profile, correlationId, success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    console.info("Profile GET success", {
      scope: "profile.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile GET unhandled error", {
      scope: "profile.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to process profile request",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(request);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID not found in token", correlationId }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const rateLimitResult = checkApiRateLimit(
      `profile_update_${userId}`,
      20,
      60000
    );
    if (!rateLimitResult.allowed) {
      console.warn("Profile PUT rate limit", {
        scope: "profile.update",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", correlationId }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable", correlationId }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await request.json();
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
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;
    const adminOnlyFields = ["subscriptionPlan", "subscriptionExpiresAt"];
    const hasAdminFields = adminOnlyFields.some(
      (field) => field in sanitizedBody
    );
    if (hasAdminFields) {
      adminOnlyFields.forEach((field) => delete sanitizedBody[field]);
    }
    const updates = Object.fromEntries(
      Object.entries(sanitizedBody).filter(([key]) =>
        (ALLOWED_UPDATE_FIELDS as readonly string[]).includes(key)
      )
    ) as Record<string, unknown>;
    if (Object.keys(updates).length === 0)
      return new Response(
        JSON.stringify({
          error: "No valid profile fields provided.",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const validation = validateProfileData(updates);
    if (!validation.isValid)
      return new Response(
        JSON.stringify({
          error: validation.error || "Invalid profile data",
          correlationId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    const profile = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    } as any);
    if (!profile)
      return new Response(
        JSON.stringify({ error: "User profile not found", correlationId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    if (profile.userId !== userId)
      return new Response(
        JSON.stringify({ error: "Unauthorized", correlationId }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );

    await fetchMutation(api.users.updateProfile, { updates } as any);
    const updatedProfile = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    } as any);

    if (isProfileWithEmail(updatedProfile)) {
      try {
        await Notifications.profileCreated(
          updatedProfile.email,
          updatedProfile
        );
        await Notifications.profileCreatedAdmin(updatedProfile);
      } catch (e) {
        console.error("Profile PUT notification error", {
          scope: "profile.update",
          type: "notify_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
        });
      }
    }
    const response = new Response(
      JSON.stringify({
        profile: updatedProfile,
        message: "Profile updated successfully",
        correlationId,
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    console.info("Profile PUT success", {
      scope: "profile.update",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile PUT unhandled error", {
      scope: "profile.update",
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
}

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(req);
    if (!userId)
      return new Response(
        JSON.stringify({ error: "User ID not found in token", correlationId }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
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
      body = await req.json();
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
    const existingProfile = await fetchQuery(
      api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> } as any
    );
    if (existingProfile)
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

    await fetchMutation(api.users.createProfile, profileData as any);
    const newProfile = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    } as any);
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
}

export async function DELETE(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(request);

    if (!userId)
      return new Response(
        JSON.stringify({ error: "User ID not found in token", correlationId }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
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
    const profile = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    } as any);
    if (!profile || !profile._id)
      return new Response(
        JSON.stringify({
          error: "No user or profile found for deletion",
          correlationId,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    if (profile.userId !== userId)
      return new Response(
        JSON.stringify({ error: "Unauthorized", correlationId }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    await fetchMutation(api.users.deleteProfile, { id: profile._id } as any);
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
}
