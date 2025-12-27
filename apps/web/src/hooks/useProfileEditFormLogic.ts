"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProfileFormValues, ProfileImageInfo, Profile } from "@aroosi/shared/types";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import { adminMatchesAPI } from "@/lib/api/admin/matches";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { COUNTRIES } from "@/lib/constants/countries";

export const profileSchema = z.object({
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

export type ProfileFormSchema = z.infer<typeof profileSchema>;

interface UseProfileEditFormLogicProps {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  profileId?: string;
  images: ProfileImageInfo[];
  setImages: React.Dispatch<React.SetStateAction<ProfileImageInfo[]>>;
}

export function useProfileEditFormLogic({
  initialValues,
  onSubmit,
  profileId,
  images,
  setImages,
}: UseProfileEditFormLogicProps) {
  // Normalize incoming initial values
  const normalizedInitialValues = useMemo(() => {
    const iv = initialValues || {};
    const safe = <T, D>(val: T | undefined | null, def: D): T | D =>
      val === undefined || val === null ? def : (val as any);
    const anyIv = iv as any;
    
    const clamp = (v: any, allowed: string[], empty = "") =>
      allowed.includes(String(v)) ? String(v) : empty;

    const countryInput = safe(iv.country, "") as string;
    const canonicalCountry = countryInput
      ? COUNTRIES.find(
          (c) => c.name.toLowerCase() === String(countryInput).toLowerCase()
        )?.name || countryInput
      : "";

    const mtAllowed = ["farsi-dari", "pashto", "uzbeki", "hazaragi", "turkmeni", "balochi", "nuristani", "punjabi"];
    const ethAllowed = ["tajik", "pashtun", "uzbek", "hazara", "turkmen", "baloch", "nuristani", "aimaq", "pashai", "qizilbash", "punjabi"];
    
    const normalizeToOption = (v: any, allowed: string[]) => {
      const raw = String(v || "").trim();
      if (!raw) return "";
      const lower = raw.toLowerCase();
      if (allowed.includes(lower)) return lower;
      const hyph = lower.replace(/\s+/g, "-");
      if (allowed.includes(hyph)) return hyph;
      return "";
    };

    const canonicalMotherTongue = normalizeToOption(iv.motherTongue, mtAllowed);
    const canonicalEthnicity = normalizeToOption(iv.ethnicity, ethAllowed);
    const preferred = (iv as any).preferredGender === "any" ? "both" : iv.preferredGender;

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
      diet: clamp(iv.diet, ["vegetarian", "non-vegetarian", "vegan", "halal", "kosher", ""], ""),
      smoking: clamp(iv.smoking, ["never", "occasionally", "regularly", "socially", ""], ""),
      drinking: clamp(iv.drinking, ["never", "occasionally", "socially", "regularly", ""], ""),
      physicalStatus: clamp(iv.physicalStatus, ["normal", "differently-abled", ""], ""),
      partnerPreferenceAgeMin: safe(iv.partnerPreferenceAgeMin, ""),
      partnerPreferenceAgeMax: safe(iv.partnerPreferenceAgeMax, ""),
      partnerPreferenceCity: safe(iv.partnerPreferenceCity, ""),
      preferredGender: safe(preferred as any, ""),
      profileFor: safe(iv.profileFor, "self"),
      subscriptionPlan: safe(iv.subscriptionPlan, "free"),
      subscriptionExpiresAt: anyIv.subscriptionExpiresAt,
      hideFromFreeUsers: anyIv.hideFromFreeUsers ?? false,
      motherTongue: canonicalMotherTongue,
      religion: safe(iv.religion, ""),
      ethnicity: canonicalEthnicity,
    };
  }, [initialValues]);

  const form = useForm<ProfileFormSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: normalizedInitialValues as any,
    mode: "onChange",
  });

  const { reset } = form;

  useEffect(() => {
    if (normalizedInitialValues && Object.keys(normalizedInitialValues).length > 0) {
      try {
        reset(normalizedInitialValues as any, { keepDirty: false });
      } catch (e) {
        console.warn("useProfileEditFormLogic: failed to reset form", e);
      }
    }
  }, [normalizedInitialValues, reset]);

  // Image Management
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profileId || !e.target.files?.[0]) return;
    setUploading(true);
    setImageError(null);
    try {
      const img = await adminProfilesAPI.uploadImage(profileId, e.target.files[0]);
      setImages((prev) => [...prev, img]);
    } catch (err: any) {
      setImageError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!profileId) return;
    setImageError(null);
    try {
      await adminProfilesAPI.deleteImage(profileId, imageId);
      setImages((prev) => prev.filter((img) => img.storageId !== imageId));
    } catch (err: any) {
      setImageError(err.message || "Failed to delete image");
    }
  };

  const handleReorderImages = async (newOrder: ProfileImageInfo[]) => {
    setImages(newOrder);
    if (profileId) {
      try {
        await adminProfilesAPI.updateImageOrder(
          profileId,
          newOrder
            .map((img) => img.storageId)
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        );
      } catch (err: any) {
        setImageError("Failed to update image order");
      }
    }
  };

  // Manual Match Management
  const [manualMatchName, setManualMatchName] = useState("");
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const term = manualMatchName.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { profiles } = await adminProfilesAPI.list({
          search: term,
          page: 1,
        });
        setSuggestions(profiles.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [manualMatchName]);

  const handleCreateMatch = async () => {
    if (!profileId || (!manualMatchName.trim() && !selectedProfile)) return;
    setCreatingMatch(true);
    setMatchError(null);
    try {
      let target: Profile | undefined = selectedProfile ?? undefined;
      if (!target) {
        const { profiles } = await adminProfilesAPI.list({
          search: manualMatchName.trim(),
          page: 1,
        });
        target = profiles.find((p) =>
          p.fullName.toLowerCase().includes(manualMatchName.trim().toLowerCase())
        );
      }
      if (!target) throw new Error("No matching profile found");
      if (target._id === profileId) throw new Error("Cannot match a profile with itself");

      const res = await adminMatchesAPI.create(profileId, target._id);
      if (res?.success === false) throw new Error(res.error || "Failed to match");
      showSuccessToast(`Matched with ${target.fullName}`);
      setManualMatchName("");
      setSelectedProfile(null);
      setSuggestions([]);
    } catch (err: any) {
      const msg = err.message || "Failed to match";
      setMatchError(msg);
      showErrorToast(null, msg);
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleFormSubmit = form.handleSubmit((values) => {
    return onSubmit(values as unknown as ProfileFormValues);
  });

  return {
    form,
    handleFormSubmit,
    imagesState: {
      uploading,
      imageError,
      handleImageUpload,
      handleDeleteImage,
      handleReorderImages,
    },
    matchState: {
      manualMatchName,
      setManualMatchName,
      creatingMatch,
      matchError,
      suggestions,
      selectedProfile,
      setSelectedProfile,
      handleCreateMatch,
    },
  };
}
