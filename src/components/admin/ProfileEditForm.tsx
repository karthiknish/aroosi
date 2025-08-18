"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { ProfileFormValues } from "@/types/profile";
import type { ImageType } from "@/types/image";
import type { Profile } from "@/types/profile";
import {
  adminUploadProfileImage,
  deleteAdminProfileImageById,
  updateAdminProfileImageOrder,
  createManualMatch,
  fetchAdminProfiles,
} from "@/lib/profile/adminProfileApi";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { PhoneInput } from "@/components/ui/phone-input";

// Zod schema matches ProfileFormValues (allow string for enums for compatibility)
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  phoneNumber: z
    .string()
    .regex(
      /^\+\d{1,4}\s?\d{6,14}$/i,
      "Enter a valid phone number with country code"
    ),
  aboutMe: z.string().min(1, "About Me is required"),
  height: z.string().min(1, "Height is required"),
  maritalStatus: z.string(),
  education: z.string().min(1, "Education is required"),
  occupation: z.string().min(1, "Occupation is required"),
  annualIncome: z.union([z.string(), z.number()]),
  diet: z.string().min(1, "Diet is required"),
  smoking: z.string().min(1, "Smoking is required"),
  drinking: z.string().min(1, "Drinking is required"),
  physicalStatus: z.string().min(1, "Physical status is required"),
  partnerPreferenceAgeMin: z.union([z.string(), z.number()]),
  partnerPreferenceAgeMax: z.union([z.string(), z.number()]),
  partnerPreferenceCity: z.union([z.string(), z.array(z.string())]),
  preferredGender: z.string(),
  profileFor: z.string(),

  // Hardened subscription fields
  subscriptionPlan: z.enum(["free", "premium", "premiumPlus"], {
    required_error: "Subscription plan is required",
    invalid_type_error: "Invalid subscription plan",
  }),
  subscriptionExpiresAt: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine(
      (v) => v === undefined || v === null || (Number.isInteger(v) && v > 0),
      "subscriptionExpiresAt must be a positive integer timestamp"
    )
    .optional(),
  hideFromFreeUsers: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : !!v))
    .optional(),

  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
});

type Props = {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  onCancel?: () => void;
  profileId?: string;
  token?: string;
  images: ImageType[];
  setImages?: React.Dispatch<React.SetStateAction<ImageType[]>>;
  imagesLoading: boolean;
  matches?: Profile[];
};

function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

export default function ProfileEditForm({
  initialValues,
  onSubmit,
  loading = false,
  serverError,
  onCancel,
  profileId,
  token: _token,
  images,
  setImages,
  imagesLoading,
  matches = [],
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  // --- Profile Images State ---
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Manual match state
  const [manualMatchName, setManualMatchName] = useState("");
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Debounced fetch suggestions
  useEffect(() => {
    const term = manualMatchName.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { profiles } = await fetchAdminProfiles({
          // Cookie-auth; shim token param removed
          search: term,
          page: 1,
        } as any);
        setSuggestions(profiles.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [manualMatchName]);

  // Upload image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profileId || !e.target.files?.[0]) return;
    setUploading(true);
    setImageError(null);
    try {
      const img = await adminUploadProfileImage({
        // Cookie-auth
        profileId,
        file: e.target.files[0],
      } as any);
      setImages?.((prev) => [...prev, img]);
    } catch (err: unknown) {
      setImageError(
        isErrorWithMessage(err) ? err.message : "Failed to upload image"
      );
    } finally {
      setUploading(false);
    }
  };

  // Delete image handler
  const handleDeleteImage = async (imageId: string) => {
    if (!profileId) return;
    setImageError(null);
    try {
      await deleteAdminProfileImageById({ profileId, imageId } as any);
      setImages?.((prev) =>
        prev.filter((img) => (img.id ?? img.storageId) !== imageId)
      );
    } catch (err: unknown) {
      setImageError(
        isErrorWithMessage(err) ? err.message : "Failed to delete image"
      );
    }
  };

  const handleCreateMatch = async () => {
    if (!profileId || (!manualMatchName.trim() && !selectedProfile)) return;
    setCreatingMatch(true);
    setMatchError(null);
    try {
      let target: Profile | undefined = selectedProfile ?? undefined;
      if (!target) {
        const { profiles } = await fetchAdminProfiles({
          search: manualMatchName.trim(),
          page: 1,
        } as any);
        target = profiles.find((p) =>
          p.fullName
            .toLowerCase()
            .includes(manualMatchName.trim().toLowerCase())
        );
      }
      if (!target) throw new Error("No matching profile found");
      if (target._id === profileId)
        throw new Error("Cannot match a profile with itself");

      const res = await createManualMatch({
        fromProfileId: profileId,
        toProfileId: target._id,
      } as any);
      if (!res.success) throw new Error(res.error || "Failed to match");
      showSuccessToast(`Matched with ${target.fullName}`);
      setManualMatchName("");
      setSelectedProfile(null);
      setSuggestions([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to match";
      setMatchError(msg);
      showErrorToast(null, msg);
    } finally {
      setCreatingMatch(false);
    }
  };

  return (
    <form
      className="space-y-8 bg-white p-8 rounded-lg shadow-lg"
      onSubmit={handleSubmit((values) => onSubmit(values as ProfileFormValues))}
      autoComplete="off"
    >
      <h2 className="text-2xl font-bold mb-4">Edit Profile (Admin)</h2>
      {/* Profile Images Section */}
      {profileId && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Profile Images</h3>
          {imagesLoading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size={20} /> Loading images...
            </div>
          ) : (
            <ProfileImageReorder
              images={images}
              userId={profileId}
              onReorder={async (newOrder) => {
                setImages?.(newOrder);
                if (profileId) {
                  await updateAdminProfileImageOrder({
                    profileId,
                    imageIds: newOrder
                      .map((img) => img.id ?? img.storageId ?? "")
                      .filter(Boolean),
                  } as any);
                }
              }}
              onDeleteImage={handleDeleteImage}
              loading={imagesLoading}
            />
          )}
          <div className="flex items-center gap-4 mt-2">
            <label htmlFor="profile-image-upload" className="block">
              <span className="sr-only">Upload image</span>
            </label>
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
              disabled={uploading}
            />
            {uploading && <LoadingSpinner size={16} />}
            {imageError && (
              <span className="text-red-600 text-sm">{imageError}</span>
            )}
          </div>
        </div>
      )}
      {serverError && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
          {serverError}
        </div>
      )}
      {/* Form Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="col-span-2 mb-2">
          <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
        </div>

        <div>
          <label className="block font-medium" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            {...register("fullName")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Full name"
          />
          {errors.fullName && (
            <p className="text-red-600 text-sm">{errors.fullName.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="dateOfBirth">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="YYYY-MM-DD"
          />
          {errors.dateOfBirth && (
            <p className="text-red-600 text-sm">{errors.dateOfBirth.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            {...register("gender")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <p className="text-red-600 text-sm">{errors.gender.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="city">
            City
          </label>
          <input
            id="city"
            {...register("city")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="City"
          />
          {errors.city && (
            <p className="text-red-600 text-sm">{errors.city.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="country">
            Country
          </label>
          <input
            id="country"
            {...register("country")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Country"
          />
          {errors.country && (
            <p className="text-red-600 text-sm">{errors.country.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="phoneNumber">
            Phone Number
          </label>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <div>
                <PhoneInput
                  inputId="phoneNumber"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Phone number"
                  className="w-full"
                  error={!!errors.phoneNumber}
                />
              </div>
            )}
          />
          {errors.phoneNumber && (
            <p className="text-red-600 text-sm">{errors.phoneNumber.message}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium" htmlFor="aboutMe">
            About Me
          </label>
          <textarea
            id="aboutMe"
            {...register("aboutMe")}
            className="form-textarea w-full min-h-[80px] rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Tell us about yourself..."
          />
          {errors.aboutMe && (
            <p className="text-red-600 text-sm">{errors.aboutMe.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="height">
            Height
          </label>
          <input
            id="height"
            {...register("height")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Height"
          />
          {errors.height && (
            <p className="text-red-600 text-sm">{errors.height.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="maritalStatus">
            Marital Status
          </label>
          <select
            id="maritalStatus"
            {...register("maritalStatus")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="single">Single</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="annulled">Annulled</option>
          </select>
          {errors.maritalStatus && (
            <p className="text-red-600 text-sm">
              {errors.maritalStatus.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="education">
            Education
          </label>
          <input
            id="education"
            {...register("education")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Education"
          />
          {errors.education && (
            <p className="text-red-600 text-sm">{errors.education.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="occupation">
            Occupation
          </label>
          <input
            id="occupation"
            {...register("occupation")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Occupation"
          />
          {errors.occupation && (
            <p className="text-red-600 text-sm">{errors.occupation.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="annualIncome">
            Annual Income
          </label>
          <input
            id="annualIncome"
            type="number"
            {...register("annualIncome")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Annual Income"
          />
          {errors.annualIncome && (
            <p className="text-red-600 text-sm">
              {errors.annualIncome.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="diet">
            Diet
          </label>
          <input
            id="diet"
            {...register("diet")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Diet"
          />
          {errors.diet && (
            <p className="text-red-600 text-sm">{errors.diet.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="smoking">
            Smoking
          </label>
          <input
            id="smoking"
            {...register("smoking")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Smoking"
          />
          {errors.smoking && (
            <p className="text-red-600 text-sm">{errors.smoking.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="drinking">
            Drinking
          </label>
          <input
            id="drinking"
            {...register("drinking")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Drinking"
          />
          {errors.drinking && (
            <p className="text-red-600 text-sm">{errors.drinking.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="physicalStatus">
            Physical Status
          </label>
          <input
            id="physicalStatus"
            {...register("physicalStatus")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Physical status"
          />
          {errors.physicalStatus && (
            <p className="text-red-600 text-sm">
              {errors.physicalStatus.message}
            </p>
          )}
        </div>
        <div>
          <label
            className="block font-medium"
            htmlFor="partnerPreferenceAgeMin"
          >
            Partner Preference Age Min
          </label>
          <input
            id="partnerPreferenceAgeMin"
            type="number"
            {...register("partnerPreferenceAgeMin")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Partner Preference Age Min"
          />
          {errors.partnerPreferenceAgeMin && (
            <p className="text-red-600 text-sm">
              {errors.partnerPreferenceAgeMin.message}
            </p>
          )}
        </div>
        <div>
          <label
            className="block font-medium"
            htmlFor="partnerPreferenceAgeMax"
          >
            Partner Preference Age Max
          </label>
          <input
            id="partnerPreferenceAgeMax"
            type="number"
            {...register("partnerPreferenceAgeMax")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Partner Preference Age Max"
          />
          {errors.partnerPreferenceAgeMax && (
            <p className="text-red-600 text-sm">
              {errors.partnerPreferenceAgeMax.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="partnerPreferenceCity">
            Partner Preference City/Cities
          </label>
          <input
            id="partnerPreferenceCity"
            {...register("partnerPreferenceCity")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Partner Preference City/Cities"
          />
          {errors.partnerPreferenceCity && (
            <p className="text-red-600 text-sm">
              {errors.partnerPreferenceCity.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="preferredGender">
            Preferred Gender
          </label>
          <select
            id="preferredGender"
            {...register("preferredGender")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="any">Any</option>
            <option value="other">Other</option>
            <option value="">(Unspecified)</option>
          </select>
          {errors.preferredGender && (
            <p className="text-red-600 text-sm">
              {errors.preferredGender.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium" htmlFor="profileFor">
            Profile For
          </label>
          <select
            id="profileFor"
            {...register("profileFor")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="self">Self</option>
            <option value="friend">Friend</option>
            <option value="family">Family</option>
          </select>
          {errors.profileFor && (
            <p className="text-red-600 text-sm">{errors.profileFor.message}</p>
          )}
        </div>
        <div className="md:col-span-1">
          <label className="block font-medium" htmlFor="subscriptionPlan">
            Subscription Plan
          </label>
          <select
            id="subscriptionPlan"
            {...register("subscriptionPlan")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            {/* Ensure labels stay consistent with server constants */}
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="premiumPlus">Premium Plus</option>
          </select>
          {errors.subscriptionPlan && (
            <p className="text-red-600 text-sm">
              {errors.subscriptionPlan.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Labels mirror server SUBSCRIPTION_PLANS; changing plan here does not
            create Stripe billing.
          </p>
        </div>

        {/* Subscription admin fields */}
        <div className="md:col-span-1">
          <label className="block font-medium" htmlFor="subscriptionExpiresAt">
            Subscription Expires At
          </label>
          <input
            id="subscriptionExpiresAt"
            type="number"
            {...register("subscriptionExpiresAt")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Unix ms timestamp"
          />
          {errors.subscriptionExpiresAt && (
            <p className="text-red-600 text-sm">
              {errors.subscriptionExpiresAt.message as string}
            </p>
          )}
          {/* Read-only preview */}
          <SubscriptionExpiryPreview control={control as any} />
        </div>

        <div className="md:col-span-1">
          <label
            htmlFor="hideFromFreeUsers"
            className="inline-flex items-center gap-2 font-medium"
          >
            <input
              id="hideFromFreeUsers"
              type="checkbox"
              {...register("hideFromFreeUsers")}
              className="rounded border-gray-300"
            />
            Hide from Free Users
          </label>
        </div>

        {/* Cultural Information */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="motherTongue"
          >
            Mother Tongue
          </label>
          <select
            id="motherTongue"
            {...register("motherTongue")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="">Select Mother Tongue</option>
            <option value="farsi-dari">Farsi Dari</option>
            <option value="pashto">Pashto</option>
            <option value="uzbeki">Uzbeki</option>
            <option value="hazaragi">Hazaragi</option>
            <option value="turkmeni">Turkmeni</option>
            <option value="balochi">Balochi</option>
            <option value="nuristani">Nuristani</option>
            <option value="punjabi">Punjabi</option>
          </select>
          {errors.motherTongue && (
            <p className="text-red-600 text-sm">
              {errors.motherTongue.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="religion"
          >
            Religion
          </label>
          <select
            id="religion"
            {...register("religion")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="">Select Religion</option>
            <option value="muslim">Muslim</option>
            <option value="hindu">Hindu</option>
            <option value="sikh">Sikh</option>
          </select>
          {errors.religion && (
            <p className="text-red-600 text-sm">{errors.religion.message}</p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="ethnicity"
          >
            Ethnicity
          </label>
          <select
            id="ethnicity"
            {...register("ethnicity")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="">Select Ethnicity</option>
            <option value="tajik">Tajik</option>
            <option value="pashtun">Pashtun</option>
            <option value="uzbek">Uzbek</option>
            <option value="hazara">Hazara</option>
            <option value="turkmen">Turkmen</option>
            <option value="baloch">Baloch</option>
            <option value="nuristani">Nuristani</option>
            <option value="aimaq">Aimaq</option>
            <option value="pashai">Pashai</option>
            <option value="qizilbash">Qizilbash</option>
            <option value="punjabi">Punjabi</option>
          </select>
          {errors.ethnicity && (
            <p className="text-red-600 text-sm">{errors.ethnicity.message}</p>
          )}
        </div>
      </div>
      {/* Manual Match Section */}
      {profileId && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-2">Manual Match</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Enter another profile name to create an immediate mutual match.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={manualMatchName}
              onChange={(e) => {
                setManualMatchName(e.target.value);
                setSelectedProfile(null);
              }}
              placeholder="Other profile name"
              className="flex-1 form-input rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-foreground"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={
                (!manualMatchName.trim() && !selectedProfile) || creatingMatch
              }
              onClick={handleCreateMatch}
            >
              {creatingMatch ? <LoadingSpinner size={16} /> : "Match Now"}
            </Button>
          </div>
          {matchError && (
            <p className="text-sm text-red-600 mt-2">{matchError}</p>
          )}

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="border mt-2 rounded-md bg-white shadow max-h-60 overflow-auto z-50">
              {suggestions.map((sug) => (
                <button
                  key={sug._id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-pink-50 cursor-pointer text-foreground"
                  onClick={() => {
                    setSelectedProfile(sug);
                    setManualMatchName(sug.fullName);
                    setSuggestions([]);
                  }}
                >
                  {sug.fullName} – {sug.city}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Matches List */}
      {matches.length > 0 && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Current Matches ({matches.length})
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            {matches.map((m) => (
              <li key={m._id} className="text-sm text-foreground">
                {m.fullName} — {m.city}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-4 mt-8">
        <Button
          type="submit"
          className="bg-pink-600 hover:bg-pink-700"
          disabled={loading}
        >
          {loading && <LoadingSpinner size={16} className="mr-2" />}
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Read-only preview for subscription expiry:
 * - Shows formatted date
 * - Days remaining (if in future)
 * - Placeholder for spotlight badge expiry preview (if applicable)
 */
function SubscriptionExpiryPreview({
  control,
}: {
  control: ReturnType<typeof useForm>["control"];
}) {
  // Public API: watch the single field value reactively
  const raw = useWatch({ control, name: "subscriptionExpiresAt" });
  const num = typeof raw === "string" ? Number(raw) : raw;
  const value = Number.isFinite(num) ? (num as number) : null;

  if (!value) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        No expiry set. Users on paid plans should have a future timestamp in ms.
      </p>
    );
  }

  const date = new Date(value);
  const now = Date.now();
  const diffDays = Math.ceil((value - now) / (1000 * 60 * 60 * 24));
  const isFuture = value > now;

  return (
    <div className="text-xs text-muted-foreground mt-1 space-y-1">
      <div>
        Formatted:{" "}
        {isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString()}
      </div>
      <div>
        {isFuture
          ? `Days remaining: ${diffDays}`
          : `Expired ${Math.abs(diffDays)} day(s) ago`}
      </div>
      <div className="italic opacity-80">
        Spotlight badge expiry: not available for this profile
      </div>
    </div>
  );
}
