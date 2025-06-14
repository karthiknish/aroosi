"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { ProfileFormValues } from "@/types/profile";
import type { ImageType } from "@/types/image";
import {
  adminUploadProfileImage,
  deleteAdminProfileImageById,
  updateAdminProfileImageOrder,
} from "@/lib/profile/adminProfileApi";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";

// Zod schema matches ProfileFormValues (allow string for enums for compatibility)
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string(),
  ukCity: z.string().min(1, "City is required"),
  ukPostcode: z.string().min(1, "Postcode is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
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
  partnerPreferenceUkCity: z.union([z.string(), z.array(z.string())]),
  preferredGender: z.string(),
  profileFor: z.string(),
  subscriptionPlan: z.string(),
  isApproved: z.boolean().optional(),
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
  token,
  images,
  setImages,
  imagesLoading,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  // --- Profile Images State ---
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profileId || !token || !e.target.files?.[0]) return;
    setUploading(true);
    setImageError(null);
    try {
      const img = await adminUploadProfileImage({
        token,
        profileId,
        file: e.target.files[0],
      });
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
    if (!profileId || !token) return;
    setImageError(null);
    try {
      await deleteAdminProfileImageById({ token, profileId, imageId });
      setImages((prev) =>
        prev.filter((img) => (img.id ?? img.storageId) !== imageId)
      );
    } catch (err: unknown) {
      setImageError(
        isErrorWithMessage(err) ? err.message : "Failed to delete image"
      );
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
      {profileId && token && (
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
                setImages(newOrder);
                if (profileId && token) {
                  await updateAdminProfileImageOrder({
                    token,
                    profileId,
                    imageIds: newOrder
                      .map((img) => img.id ?? img.storageId ?? "")
                      .filter(Boolean),
                  });
                }
              }}
              onDeleteImage={handleDeleteImage}
              loading={imagesLoading}
            />
          )}
          <div className="flex items-center gap-4 mt-2">
            <label className="block">
              <span className="sr-only">Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                disabled={uploading}
              />
            </label>
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
        <div className="col-span-2 flex items-center mb-2">
          <input
            type="checkbox"
            id="isApproved"
            {...register("isApproved")}
            className="mr-2 h-4 w-4"
            defaultChecked={!!initialValues.isApproved}
          />
          <label htmlFor="isApproved" className="font-medium">
            Approved (Admin Only)
          </label>
        </div>
        <div>
          <label className="block font-medium">Full Name</label>
          <input
            {...register("fullName")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Full name"
          />
          {errors.fullName && (
            <p className="text-red-600 text-sm">{errors.fullName.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Date of Birth</label>
          <input
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
          <label className="block font-medium">Gender</label>
          <select
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
          <label className="block font-medium">City</label>
          <input
            {...register("ukCity")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="City"
          />
          {errors.ukCity && (
            <p className="text-red-600 text-sm">{errors.ukCity.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Postcode</label>
          <input
            {...register("ukPostcode")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Postcode"
          />
          {errors.ukPostcode && (
            <p className="text-red-600 text-sm">{errors.ukPostcode.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Phone Number</label>
          <input
            {...register("phoneNumber")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Phone number"
          />
          {errors.phoneNumber && (
            <p className="text-red-600 text-sm">{errors.phoneNumber.message}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium">About Me</label>
          <textarea
            {...register("aboutMe")}
            className="form-textarea w-full min-h-[80px] rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Tell us about yourself..."
          />
          {errors.aboutMe && (
            <p className="text-red-600 text-sm">{errors.aboutMe.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Height</label>
          <input
            {...register("height")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Height"
          />
          {errors.height && (
            <p className="text-red-600 text-sm">{errors.height.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Marital Status</label>
          <select
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
          <label className="block font-medium">Education</label>
          <input
            {...register("education")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Education"
          />
          {errors.education && (
            <p className="text-red-600 text-sm">{errors.education.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Occupation</label>
          <input
            {...register("occupation")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Occupation"
          />
          {errors.occupation && (
            <p className="text-red-600 text-sm">{errors.occupation.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Annual Income</label>
          <input
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
          <label className="block font-medium">Diet</label>
          <input
            {...register("diet")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Diet"
          />
          {errors.diet && (
            <p className="text-red-600 text-sm">{errors.diet.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Smoking</label>
          <input
            {...register("smoking")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Smoking"
          />
          {errors.smoking && (
            <p className="text-red-600 text-sm">{errors.smoking.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Drinking</label>
          <input
            {...register("drinking")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Drinking"
          />
          {errors.drinking && (
            <p className="text-red-600 text-sm">{errors.drinking.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">Physical Status</label>
          <input
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
          <label className="block font-medium">
            Partner Preference Age Min
          </label>
          <input
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
          <label className="block font-medium">
            Partner Preference Age Max
          </label>
          <input
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
          <label className="block font-medium">
            Partner Preference UK City/Cities
          </label>
          <input
            {...register("partnerPreferenceUkCity")}
            className="form-input w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Partner Preference UK City/Cities"
          />
          {errors.partnerPreferenceUkCity && (
            <p className="text-red-600 text-sm">
              {errors.partnerPreferenceUkCity.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-medium">Preferred Gender</label>
          <select
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
          <label className="block font-medium">Profile For</label>
          <select
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
        <div>
          <label className="block font-medium">Subscription Plan</label>
          <select
            {...register("subscriptionPlan")}
            className="form-select w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="premiumPlus">Premium Plus</option>
          </select>
          {errors.subscriptionPlan && (
            <p className="text-red-600 text-sm">
              {errors.subscriptionPlan.message}
            </p>
          )}
        </div>
      </div>
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
