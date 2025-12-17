"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { COUNTRIES } from "@/lib/constants/countries";
import { useMemo } from "react";

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
  // Parity with onboarding/ProfileCreationModal
  diet: z
    .enum(["vegetarian", "non-vegetarian", "vegan", "halal", "kosher"])
    .or(z.literal("")),
  smoking: z
    .enum(["never", "occasionally", "regularly", "socially"])
    .or(z.literal("")),
  drinking: z
    .enum(["never", "occasionally", "socially", "regularly"])
    .or(z.literal("")),
  physicalStatus: z.enum(["normal", "differently-abled"]).or(z.literal("")),
  partnerPreferenceAgeMin: z.union([z.string(), z.number()]),
  partnerPreferenceAgeMax: z.union([z.string(), z.number()]),
  partnerPreferenceCity: z.union([z.string(), z.array(z.string())]),
  preferredGender: z
    .enum(["male", "female", "both", "other"])
    .or(z.literal("")),
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
  setImages: React.Dispatch<React.SetStateAction<ImageType[]>>;
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
  // Normalize incoming initial values so all expected fields exist with a safe type.
  const normalizedInitialValues = useMemo(() => {
    const iv = initialValues || {};
    const safe = <T, D>(val: T | undefined | null, def: D): T | D =>
      val === undefined || val === null ? def : (val as any);
    const anyIv = iv as any; // allow access to extended fields not in ProfileFormValues
    // Map legacy values to onboarding equivalents (e.g., preferredGender: any -> both)
    const clamp = (v: any, allowed: string[], empty = "") =>
      allowed.includes(String(v)) ? String(v) : empty;
    // Canonicalize country using COUNTRIES (case-insensitive)
    const countryInput = safe(iv.country, "") as string;
    const canonicalCountry = countryInput
      ? COUNTRIES.find(
          (c) => c.name.toLowerCase() === String(countryInput).toLowerCase()
        )?.name || countryInput
      : "";
    // Canonicalize motherTongue, ethnicity to option values (lowercase, hyphenated where needed)
    const mtAllowed = [
      "farsi-dari",
      "pashto",
      "uzbeki",
      "hazaragi",
      "turkmeni",
      "balochi",
      "nuristani",
      "punjabi",
    ];
    const ethAllowed = [
      "tajik",
      "pashtun",
      "uzbek",
      "hazara",
      "turkmen",
      "baloch",
      "nuristani",
      "aimaq",
      "pashai",
      "qizilbash",
      "punjabi",
    ];
    const normalizeToOption = (v: any, allowed: string[]) => {
      const raw = String(v || "").trim();
      if (!raw) return "";
      const lower = raw.toLowerCase();
      // try direct
      if (allowed.includes(lower)) return lower;
      // try hyphenated
      const hyph = lower.replace(/\s+/g, "-");
      if (allowed.includes(hyph)) return hyph;
      return "";
    };
    const canonicalMotherTongue = normalizeToOption(iv.motherTongue, mtAllowed);
    const canonicalEthnicity = normalizeToOption(iv.ethnicity, ethAllowed);
    const preferred =
      (iv as any).preferredGender === "any" ? "both" : iv.preferredGender;
    const dietClamped = clamp(
      iv.diet,
      ["vegetarian", "non-vegetarian", "vegan", "halal", "kosher", ""],
      ""
    );
    const smokingClamped = clamp(
      iv.smoking,
      ["never", "occasionally", "regularly", "socially", ""],
      ""
    );
    const drinkingClamped = clamp(
      iv.drinking,
      ["never", "occasionally", "socially", "regularly", ""],
      ""
    );
    const physicalClamped = clamp(
      iv.physicalStatus,
      ["normal", "differently-abled", ""],
      ""
    );
    return {
      fullName: safe(iv.fullName, ""),
      dateOfBirth: safe(iv.dateOfBirth, ""),
      gender: safe(iv.gender, ""),
      city: safe(iv.city, ""),
      country: canonicalCountry,
      phoneNumber: safe(iv.phoneNumber, ""),
      aboutMe: safe(iv.aboutMe, ""),
      height: safe(iv.height, ""),
      maritalStatus: safe(iv.maritalStatus, ""),
      education: safe(iv.education, ""),
      occupation: safe(iv.occupation, ""),
      annualIncome: safe(iv.annualIncome, ""),
      diet: dietClamped,
      smoking: smokingClamped,
      drinking: drinkingClamped,
      physicalStatus: physicalClamped,
      partnerPreferenceAgeMin: safe(iv.partnerPreferenceAgeMin, ""),
      partnerPreferenceAgeMax: safe(iv.partnerPreferenceAgeMax, ""),
      partnerPreferenceCity: safe(iv.partnerPreferenceCity, ""),
      preferredGender: safe(preferred as any, ""),
      profileFor: safe(iv.profileFor, "self"),
      subscriptionPlan: safe(iv.subscriptionPlan, "free"),
      // Extended admin-only fields (not part of narrow ProfileFormValues type yet)
      subscriptionExpiresAt: anyIv.subscriptionExpiresAt,
      hideFromFreeUsers: anyIv.hideFromFreeUsers ?? false,
      motherTongue: canonicalMotherTongue,
      religion: safe(iv.religion, ""),
      ethnicity: canonicalEthnicity,
    } as Partial<ProfileFormValues>;
  }, [initialValues]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: normalizedInitialValues as any,
    mode: "onChange",
  });

  // Ensure that if `initialValues` arrives/changes after mount (async fetch),
  // the form is reset to reflect those values. useForm's defaultValues only
  // applies on first render.
  useEffect(() => {
    if (
      normalizedInitialValues &&
      Object.keys(normalizedInitialValues).length > 0
    ) {
      try {
        reset(normalizedInitialValues as any, { keepDirty: false });

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug(
            "[ProfileEditForm] Reset with values",
            normalizedInitialValues
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          "ProfileEditForm: failed to reset form with normalizedInitialValues",
          e
        );
      }
    }
  }, [normalizedInitialValues, reset]);

  // Country options
  const countries = useMemo(() => COUNTRIES.map((c) => c.name).sort(), []);

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
      setImages((prev) => [...prev, img]);
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
      setImages((prev) =>
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
      className="space-y-10 bg-base-light p-6 sm:p-10 rounded-2xl shadow-sm border border-neutral/10"
      onSubmit={handleSubmit((values) =>
        onSubmit(values as unknown as ProfileFormValues)
      )}
      autoComplete="off"
    >
      <div className="flex items-center justify-between border-b border-neutral/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">Edit Profile</h2>
          <p className="text-sm text-neutral-light mt-1">Update user information and settings</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-neutral/20 text-neutral-dark hover:bg-neutral/5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={loading}
          >
            {loading && <LoadingSpinner size={16} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Profile Images Section */}
      {profileId && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-dark">Profile Images</h3>
            <div className="flex items-center gap-3">
              {uploading && <LoadingSpinner size={16} />}
              <label className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Upload New
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          
          {imagesLoading ? (
            <div className="flex items-center justify-center py-12 bg-neutral/5 rounded-xl border border-dashed border-neutral/20">
              <div className="flex items-center gap-3 text-neutral-light">
                <LoadingSpinner size={20} /> 
                <span>Loading images...</span>
              </div>
            </div>
          ) : (
            <div className="bg-neutral/5 p-6 rounded-xl border border-neutral/10">
              <ProfileImageReorder
                images={images}
                userId={profileId}
                onReorder={async (newOrder) => {
                  setImages(newOrder);
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
            </div>
          )}
          {imageError && (
            <p className="text-danger text-sm font-medium">{imageError}</p>
          )}
        </section>
      )}

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium">
          {serverError}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-12">
        {/* Personal Info */}
        <section>
          <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                {...register("fullName")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Full name"
              />
              {errors.fullName && (
                <p className="text-danger text-xs font-medium">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="dateOfBirth">
                Date of Birth
              </label>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-base-light h-[42px] rounded-xl border-neutral/20 text-neutral-dark",
                          !field.value && "text-neutral-light"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(new Date(field.value as string), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-base-light border-neutral/10" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value as string) : undefined
                        }
                        onSelect={(date) => {
                          if (!date || isNaN(date.getTime())) return;
                          field.onChange(format(date, "yyyy-MM-dd"));
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          const minDate = new Date(
                            today.getFullYear() - 18,
                            today.getMonth(),
                            today.getDate()
                          );
                          return date > minDate || date < new Date("1900-01-01");
                        }}
                        captionLayout="dropdown"
                        defaultMonth={new Date(2000, 0, 1)}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dateOfBirth && (
                <p className="text-danger text-xs font-medium">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                {...register("gender")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="phoneNumber">
                Phone Number
              </label>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    inputId="phoneNumber"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Phone number"
                    className="w-full"
                    error={!!errors.phoneNumber}
                  />
                )}
              />
              {errors.phoneNumber && (
                <p className="text-danger text-xs font-medium">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="city">
                City
              </label>
              <input
                id="city"
                {...register("city")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="country">
                Country
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={countries.map((c) => ({ value: c, label: c }))}
                    value={(field.value as string) || ""}
                    onValueChange={(v) => field.onChange(v)}
                    placeholder="Select country"
                    className="w-full"
                  />
                )}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="aboutMe">
                About Me
              </label>
              <textarea
                id="aboutMe"
                {...register("aboutMe")}
                className="w-full px-4 py-3 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[120px]"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </section>

        {/* Professional & Lifestyle */}
        <section>
          <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Professional & Lifestyle
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="education">
                Education
              </label>
              <input
                id="education"
                {...register("education")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Education"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="occupation">
                Occupation
              </label>
              <input
                id="occupation"
                {...register("occupation")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Occupation"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="annualIncome">
                Annual Income
              </label>
              <input
                id="annualIncome"
                type="number"
                {...register("annualIncome")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Annual Income"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="height">
                Height
              </label>
              <input
                id="height"
                {...register("height")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Height"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="maritalStatus">
                Marital Status
              </label>
              <select
                id="maritalStatus"
                {...register("maritalStatus")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="single">Single</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="annulled">Annulled</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="diet">
                Diet
              </label>
              <select
                id="diet"
                {...register("diet")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="">(Unspecified)</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="halal">Halal</option>
                <option value="kosher">Kosher</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="smoking">
                Smoking
              </label>
              <select
                id="smoking"
                {...register("smoking")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="">(Unspecified)</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="regularly">Regularly</option>
                <option value="socially">Socially</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="drinking">
                Drinking
              </label>
              <select
                id="drinking"
                {...register("drinking")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="">(Unspecified)</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="physicalStatus">
                Physical Status
              </label>
              <select
                id="physicalStatus"
                {...register("physicalStatus")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="">(Unspecified)</option>
                <option value="normal">Normal</option>
                <option value="differently-abled">Differently Abled</option>
              </select>
            </div>
          </div>
        </section>

        {/* Cultural & Religious */}
        <section>
          <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Cultural & Religious
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="motherTongue">
                Mother Tongue
              </label>
              <select
                id="motherTongue"
                {...register("motherTongue")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="religion">
                Religion
              </label>
              <select
                id="religion"
                {...register("religion")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="">Select Religion</option>
                <option value="muslim">Muslim</option>
                <option value="hindu">Hindu</option>
                <option value="sikh">Sikh</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="ethnicity">
                Ethnicity
              </label>
              <select
                id="ethnicity"
                {...register("ethnicity")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
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
            </div>
          </div>
        </section>

        {/* Partner Preferences */}
        <section>
          <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Partner Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceAgeMin">
                  Min Age
                </label>
                <input
                  id="partnerPreferenceAgeMin"
                  type="number"
                  {...register("partnerPreferenceAgeMin")}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceAgeMax">
                  Max Age
                </label>
                <input
                  id="partnerPreferenceAgeMax"
                  type="number"
                  {...register("partnerPreferenceAgeMax")}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="preferredGender">
                Preferred Gender
              </label>
              <select
                id="preferredGender"
                {...register("preferredGender")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="both">Both</option>
                <option value="other">Other</option>
                <option value="">(Unspecified)</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceCity">
                Preferred Cities
              </label>
              <input
                id="partnerPreferenceCity"
                {...register("partnerPreferenceCity")}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. London, Kabul, Dubai"
              />
            </div>
          </div>
        </section>

        {/* Admin & Subscription */}
        <section className="bg-neutral/5 p-6 rounded-2xl border border-neutral/10">
          <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Admin & Subscription
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-dark" htmlFor="subscriptionPlan">
                  Subscription Plan
                </label>
                <select
                  id="subscriptionPlan"
                  {...register("subscriptionPlan")}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="premiumPlus">Premium Plus</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-base-light rounded-xl border border-neutral/10">
                <input
                  id="hideFromFreeUsers"
                  type="checkbox"
                  {...register("hideFromFreeUsers")}
                  className="w-5 h-5 rounded border-neutral/30 text-primary focus:ring-primary/20"
                />
                <label htmlFor="hideFromFreeUsers" className="text-sm font-semibold text-neutral-dark cursor-pointer">
                  Hide from Free Users
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-dark" htmlFor="subscriptionExpiresAt">
                  Subscription Expiry (Unix ms)
                </label>
                <input
                  id="subscriptionExpiresAt"
                  type="number"
                  {...register("subscriptionExpiresAt")}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
                  placeholder="Unix ms timestamp"
                />
                <SubscriptionExpiryPreview control={control as any} />
              </div>
            </div>
          </div>
        </section>

        {/* Manual Match Section */}
        {profileId && (
          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <h3 className="text-lg font-bold text-primary mb-2">Manual Match</h3>
            <p className="text-sm text-primary/70 mb-6">
              Create an immediate mutual match with another profile.
            </p>
            
            <div className="relative">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={manualMatchName}
                  onChange={(e) => {
                    setManualMatchName(e.target.value);
                    setSelectedProfile(null);
                  }}
                  placeholder="Search profile by name..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-primary/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
                />
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 h-[42px] px-6 text-white"
                  disabled={(!manualMatchName.trim() && !selectedProfile) || creatingMatch}
                  onClick={handleCreateMatch}
                >
                  {creatingMatch ? <LoadingSpinner size={16} /> : "Create Match"}
                </Button>
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-base-light border border-neutral/20 rounded-xl shadow-xl overflow-hidden z-50">
                  {suggestions.map((sug) => (
                    <button
                      key={sug._id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-neutral/5 transition-colors border-b border-neutral/10 last:border-0"
                      onClick={() => {
                        setSelectedProfile(sug);
                        setManualMatchName(sug.fullName);
                        setSuggestions([]);
                      }}
                    >
                      <div className="font-semibold text-neutral-dark">{sug.fullName}</div>
                      <div className="text-xs text-neutral-light">{sug.city}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {matchError && (
              <p className="text-sm text-danger mt-3 font-medium">{matchError}</p>
            )}

            {/* Matches List */}
            {matches.length > 0 && (
              <div className="mt-8 pt-6 border-t border-primary/10">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
                  Current Matches ({matches.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {matches.map((m) => (
                    <div key={m._id} className="bg-base-light px-3 py-1.5 rounded-full border border-primary/10 text-xs font-medium text-primary flex items-center gap-2">
                      {m.fullName}
                      <span className="w-1 h-1 rounded-full bg-primary/30" />
                      {m.city}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex items-center justify-end gap-4 pt-8 border-t border-neutral/10">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="px-8 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 px-8 text-white"
          disabled={loading}
        >
          {loading && <LoadingSpinner size={16} className="mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
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
  // Use react-hook-form's public useWatch to observe the subscriptionExpiresAt value.
  const raw = useWatch({ control, name: "subscriptionExpiresAt" }) as
    | number
    | string
    | null
    | undefined;

  const num =
    raw === undefined || raw === null
      ? null
      : typeof raw === "string"
        ? Number(raw)
        : raw;
  const value = Number.isFinite(num as number) ? (num as number) : null;

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
      <div>Formatted: {date.toLocaleString()}</div>
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
