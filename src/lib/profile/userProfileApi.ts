import { Profile } from "@/types/profile";
import { ProfileFormValues } from "@/components/profile/ProfileForm";

export async function fetchUserProfile(token: string, userId: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(`/api/profile-detail/${userId}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function fetchUserProfileImages(token: string, userId: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(`/api/profile-detail/${userId}/images`, { headers });
  if (!res.ok) throw new Error("Failed to fetch profile images");
  return res.json();
}

export async function updateUserProfile(
  token: string,
  updates: Partial<Profile>
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`/api/profile`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function submitProfile(
  token: string,
  values: Partial<ProfileFormValues>,
  mode: "create" | "edit"
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Format the data for profile creation
  const profileData = {
    fullName: values.fullName,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    ukCity: values.ukCity,
    aboutMe: values.aboutMe,
    religion: values.religion,
    caste: values.caste || "",
    occupation: values.occupation,
    education: values.education,
    height: values.height,
    maritalStatus: values.maritalStatus,
    smoking: (values.smoking as "no" | "occasionally" | "yes" | "") || "",
    drinking: values.drinking || "no",
    profileImageIds: values.profileImageIds || [],
    isProfileComplete: true,
  };

  const res = await fetch("/api/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify(mode === "create" ? profileData : values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.error || "Failed to submit profile");
  }

  return res.json();
}
