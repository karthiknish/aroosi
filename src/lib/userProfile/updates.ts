import { db, COLLECTIONS } from '@/lib/userProfile';
import { calculateProfileCompletion } from "@/lib/userProfile/calculations";
import type { UserProfile } from "@/lib/userProfile";

// Centralized create or update logic for user profiles
export async function createOrUpdateUserProfile(
  uid: string,
  email: string,
  data: Partial<UserProfile>
): Promise<UserProfile> {
  const now = Date.now();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  // Calculate age if dateOfBirth is provided
  let age: number | undefined;
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }
  const profileCompletionPercentage = calculateProfileCompletion({
    ...data,
    age,
  });
  const userProfile: UserProfile = {
    id: uid,
    uid,
    email: email.toLowerCase(),
    emailVerified: data.emailVerified || false,
    createdAt: data.createdAt || now,
    updatedAt: now,
    role: data.role || "user",
    profileCompletionPercentage,
    fullName: data.fullName,
    displayName: data.displayName,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    age: age || data.age,
    gender: data.gender,
    preferredGender: data.preferredGender,
    city: data.city,
    state: data.state,
    country: data.country,
    countryCode: data.countryCode,
    height: data.height,
    weight: data.weight,
    physicalStatus: data.physicalStatus,
    maritalStatus: data.maritalStatus,
    diet: data.diet,
    smoking: data.smoking,
    drinking: data.drinking,
    education: data.education,
    occupation: data.occupation,
    annualIncome: data.annualIncome,
    annualIncomeCurrency: data.annualIncomeCurrency,
    motherTongue: data.motherTongue,
    religion: data.religion,
    caste: data.caste,
    subcaste: data.subcaste,
    ethnicity: data.ethnicity,
    community: data.community,
    phoneNumber: data.phoneNumber,
    whatsappNumber: data.whatsappNumber,
    socialMediaLinks: data.socialMediaLinks,
    aboutMe: data.aboutMe,
    hobbies: data.hobbies,
    interests: data.interests,
    partnerPreferenceAgeMin: data.partnerPreferenceAgeMin,
    partnerPreferenceAgeMax: data.partnerPreferenceAgeMax,
    partnerPreferenceHeightMin: data.partnerPreferenceHeightMin,
    partnerPreferenceHeightMax: data.partnerPreferenceHeightMax,
    partnerPreferenceMaritalStatus: data.partnerPreferenceMaritalStatus,
    partnerPreferenceReligion: data.partnerPreferenceReligion,
    partnerPreferenceCaste: data.partnerPreferenceCaste,
    partnerPreferenceEducation: data.partnerPreferenceEducation,
    partnerPreferenceOccupation: data.partnerPreferenceOccupation,
    partnerPreferenceAnnualIncomeMin: data.partnerPreferenceAnnualIncomeMin,
    partnerPreferenceLocation: data.partnerPreferenceLocation,
    partnerPreferenceCountry: data.partnerPreferenceCountry,
    profileImageUrls: data.profileImageUrls,
    profileImageStorageIds: data.profileImageStorageIds,
    mainProfileImageIndex: data.mainProfileImageIndex,
    // Default new users to 'free' plan if not specified
    subscriptionPlan: data.subscriptionPlan || "free",
    subscriptionExpiresAt: data.subscriptionExpiresAt,
    subscriptionFeatures: data.subscriptionFeatures,
    // Engagement defaults
    boostsRemaining: data.boostsRemaining ?? 0,
    boostedUntil: data.boostedUntil ?? undefined,
    hasSpotlightBadge: data.hasSpotlightBadge,
    spotlightBadgeExpiresAt: data.spotlightBadgeExpiresAt,
    // Visibility defaults
    hideFromFreeUsers: data.hideFromFreeUsers ?? false,
    // Safety / moderation baseline counters (if model extended later)
    // reportCount / blockCount intentionally omitted from interface now; placeholder for future
    privacySettings: data.privacySettings,
    notificationPreferences: data.notificationPreferences,
    totalProfileViews: data.totalProfileViews,
    totalMessagesSent: data.totalMessagesSent,
    totalMessagesReceived: data.totalMessagesReceived,
    totalLikesGiven: data.totalLikesGiven,
    totalLikesReceived: data.totalLikesReceived,
    totalMatches: data.totalMatches,
    phoneVerified: data.phoneVerified,
    idVerified: data.idVerified,
    idVerificationDocuments: data.idVerificationDocuments,
    appVersion: data.appVersion,
    deviceInfo: data.deviceInfo,
    compatibilityScore: data.compatibilityScore,
    searchKeywords: data.searchKeywords,
    referralCode: data.referralCode,
    referredBy: data.referredBy,
    referredUsers: data.referredUsers,
    lastActiveAt: data.lastActiveAt,
    loginCount: data.loginCount,
    featuresUsed: data.featuresUsed,
    lastLoginAt: data.lastLoginAt || now,
    emailVerificationSentAt: data.emailVerificationSentAt,
    phoneVerificationSentAt: data.phoneVerificationSentAt,
    disabled: data.disabled,
    banReason: data.banReason,
    banExpiresAt: data.banExpiresAt,
    banned: data.banned,
  };
  await userRef.set(userProfile, { merge: true });
  return userProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<UserProfile> {
  const now = Date.now();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  let age: number | undefined;
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }
  const existingDoc = await userRef.get();
  const existingProfile = existingDoc.exists
    ? ({ id: existingDoc.id, ...existingDoc.data() } as UserProfile)
    : undefined;
  const merged = {
    ...existingProfile,
    ...data,
    age: age || data.age || existingProfile?.age,
    updatedAt: now,
  };
  const profileCompletionPercentage = calculateProfileCompletion(merged);
  const updateData = {
    ...data,
    age: age || data.age,
    updatedAt: now,
    profileCompletionPercentage,
  };
  await userRef.set(updateData, { merge: true });
  const updatedDoc = await userRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() } as UserProfile;
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await db.collection(COLLECTIONS.USERS).doc(uid).delete();
}
