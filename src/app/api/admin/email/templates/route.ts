import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";

type TemplateItem = {
  key: string;
  label: string;
  category: "marketing" | "transactional";
};

const MARKETING_TEMPLATES: TemplateItem[] = [
  { key: "profileCompletionReminder", label: "Profile Completion Reminder", category: "marketing" },
  { key: "premiumPromo", label: "Premium Promo", category: "marketing" },
  { key: "recommendedProfiles", label: "Recommended Profiles Digest", category: "marketing" },
  { key: "reEngagement", label: "Re-Engagement", category: "marketing" },
  { key: "successStory", label: "Success Story", category: "marketing" },
  { key: "weeklyDigest", label: "Weekly Matches Digest", category: "marketing" },
  { key: "welcomeDay1", label: "Welcome Day 1", category: "marketing" },
];

const TRANSACTIONAL_TEMPLATES: TemplateItem[] = [
  { key: "profileCreated", label: "Profile Created (user)", category: "transactional" },
  { key: "profileApproved", label: "Profile Approved (user)", category: "transactional" },
  { key: "profileBanStatus", label: "Profile Ban/Unban (user)", category: "transactional" },
  { key: "newMatch", label: "New Match (user)", category: "transactional" },
  { key: "newMessage", label: "New Message (user)", category: "transactional" },
  { key: "contactFormAdmin", label: "Contact Form (admin)", category: "transactional" },
  { key: "subscriptionChanged", label: "Subscription Changed (user)", category: "transactional" },
  { key: "contactFormUserAck", label: "Contact Form Ack (user)", category: "transactional" },
  { key: "profileCreatedAdmin", label: "Profile Created (admin)", category: "transactional" },
  { key: "subscriptionPurchasedAdmin", label: "Subscription Purchased (admin)", category: "transactional" },
  { key: "otpVerification", label: "OTP Verification (user)", category: "transactional" },
  { key: "recommendedProfilesUser", label: "Recommended Profiles (user)", category: "transactional" },
];

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const templates = [...MARKETING_TEMPLATES, ...TRANSACTIONAL_TEMPLATES];
    return successResponse({ templates });
  } catch (e) {
    return errorResponse("Failed to list templates", 500);
  }
}


