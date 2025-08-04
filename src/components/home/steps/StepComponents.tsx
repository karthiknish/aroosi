"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import type { ImageType } from "@/types/image";
import { cmToFeetInches } from "@/lib/utils/height";
import { MOTHER_TONGUE_OPTIONS, RELIGION_OPTIONS, ETHNICITY_OPTIONS } from "@/lib/constants/languages";

export type ProfileCreationData = Record<string, any>;

type ChangeHandler = (field: keyof ProfileCreationData, value: any) => void;

export function Step1Basic(props: {
  formData: ProfileCreationData;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: ChangeHandler;
}) {
  const { formData, requiredLabel, onChange } = props;
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        <p className="text-sm text-gray-600">Tell us about yourself</p>
      </div>
      <div className="mb-6">
        <Label htmlFor="profileFor" className="text-gray-700 mb-2 block">
          {requiredLabel("This profile is for")}
        </Label>
        <Select value={formData.profileFor} onValueChange={(value) => onChange("profileFor", value)}>
          <SelectTrigger id="profileFor" className="w-full bg-white">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200">
            <SelectItem value="self">Myself</SelectItem>
            <SelectItem value="son">Son</SelectItem>
            <SelectItem value="daughter">Daughter</SelectItem>
            <SelectItem value="brother">Brother</SelectItem>
            <SelectItem value="sister">Sister</SelectItem>
            <SelectItem value="friend">Friend</SelectItem>
            <SelectItem value="relative">Relative</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-6">
        <Label className="text-gray-700 mb-2 block">{requiredLabel("Gender")}</Label>
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant={formData.gender === "male" ? "default" : "outline"}
            className={`w-full ${formData.gender === "male" ? "bg-pink-600 hover:bg-pink-700" : ""}`}
            onClick={() => onChange("gender", "male")}
          >
            Male
          </Button>
          <Button
            type="button"
            variant={formData.gender === "female" ? "default" : "outline"}
            className={`w-full ${formData.gender === "female" ? "bg-pink-600 hover:bg-pink-700" : ""}`}
            onClick={() => onChange("gender", "female")}
          >
            Female
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Step2LocationPhysical(props: {
  formData: ProfileCreationData;
  errors: Record<string, string>;
  step: number;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: ChangeHandler;
  stepValidation: { getFieldError: (f: string) => string | undefined; validateCurrentStep: () => any };
  countries: string[];
}) {
  const { formData, errors, step, requiredLabel, onChange, stepValidation, countries } = props;
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="country" className="text-gray-700 mb-2 block">
          {requiredLabel("Country")}
        </Label>
        <SearchableSelect
          options={countries.map((c) => ({ value: c, label: c }))}
          value={formData.country}
          onValueChange={(v) => onChange("country", v)}
          placeholder="Select country"
          aria-invalid={!!errors.country}
          aria-describedby={errors.country ? "country-error" : undefined}
        />
      </div>

      <ValidatedInput
        label="City"
        field="city"
        step={step}
        value={formData.city}
        onValueChange={(v) => onChange("city", v)}
        placeholder="Enter your city"
        required
        hint="Enter the city where you currently live"
      />

      <div>
        <Label htmlFor="height" className="text-gray-700 mb-2 block">
          {requiredLabel("Height")}
        </Label>
        <div
          className={`rounded-md ${
            formData.height
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("height")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <SearchableSelect
            options={Array.from({ length: 198 - 137 + 1 }, (_, i) => {
              const cm = 137 + i;
              const normalized = `${cm} cm`;
              return { value: normalized, label: `${cmToFeetInches(cm)} (${cm} cm)` };
            })}
            value={
              typeof formData.height === "string" && /^\d{2,3}$/.test(formData.height.trim())
                ? `${formData.height.trim()} cm`
                : formData.height
            }
            onValueChange={(v) => {
              const normalized = typeof v === "string" ? (/^\d{2,3}$/.test(v.trim()) ? `${v.trim()} cm` : v) : v;
              onChange("height", normalized as string);
              void stepValidation.validateCurrentStep();
            }}
            placeholder="Select height"
            className="bg-white"
          />
        </div>
      </div>

      <ValidatedSelect
        label="Marital Status"
        field="maritalStatus"
        className="bg-white text-black"
        step={step}
        value={formData.maritalStatus}
        onValueChange={(v) => onChange("maritalStatus", v)}
        options={[
          { value: "single", label: "Single" },
          { value: "divorced", label: "Divorced" },
          { value: "widowed", label: "Widowed" },
          { value: "annulled", label: "Annulled" },
        ]}
        placeholder="Select marital status"
        required
      />

      <ValidatedSelect
        label="Physical Status"
        field="physicalStatus"
        step={step}
        value={formData.physicalStatus}
        onValueChange={(v) => onChange("physicalStatus", v)}
        options={[
          { value: "normal", label: "Normal" },
          { value: "differently-abled", label: "Differently Abled" },
        ]}
        placeholder="Select physical status"
      />
    </div>
  );
}

export function Step3CulturalLifestyle(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: ChangeHandler;
  stepValidation: { getFieldError: (f: string) => string | undefined };
}) {
  const { formData, step, onChange, stepValidation } = props;
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="motherTongue" className="text-gray-700 mb-2 block">
          Mother Tongue
        </Label>
        <div
          className={`rounded-md ${
            formData.motherTongue
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("motherTongue")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="motherTongue"
            step={step}
            value={formData.motherTongue}
            onValueChange={(v) => onChange("motherTongue", v)}
            options={MOTHER_TONGUE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select language"
            className="bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="religion" className="text-gray-700 mb-2 block">
          Religion
        </Label>
        <div
          className={`rounded-md ${
            formData.religion
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("religion")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="religion"
            step={step}
            value={formData.religion}
            onValueChange={(v) => onChange("religion", v)}
            options={RELIGION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select religion"
            className="bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ethnicity" className="text-gray-700 mb-2 block">
          Ethnicity
        </Label>
        <div
          className={`rounded-md ${
            formData.ethnicity
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("ethnicity")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="ethnicity"
            step={step}
            value={formData.ethnicity}
            onValueChange={(v) => onChange("ethnicity", v)}
            options={ETHNICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select ethnicity"
            className="bg-white"
          />
        </div>
      </div>

      <ValidatedSelect
        label="Diet"
        field="diet"
        step={step}
        value={formData.diet}
        onValueChange={(v) => onChange("diet", v)}
        options={[
          { value: "vegetarian", label: "Vegetarian" },
          { value: "non-vegetarian", label: "Non-Vegetarian" },
          { value: "halal", label: "Halal Only" },
          { value: "other", label: "Other" },
        ]}
        placeholder="Select diet preference"
      />

      <ValidatedSelect
        label="Smoking"
        field="smoking"
        step={step}
        value={formData.smoking}
        onValueChange={(v) => onChange("smoking", v)}
        options={[
          { value: "no", label: "No" },
          { value: "occasionally", label: "Occasionally" },
          { value: "yes", label: "Yes" },
        ]}
        placeholder="Select smoking preference"
      />

      <ValidatedSelect
        label="Drinking"
        field="drinking"
        step={step}
        value={formData.drinking}
        onValueChange={(v) => onChange("drinking", v)}
        options={[
          { value: "no", label: "No" },
          { value: "occasionally", label: "Occasionally" },
          { value: "yes", label: "Yes" },
        ]}
        placeholder="Select drinking preference"
      />
    </div>
  );
}

export function Step4EducationCareer(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: ChangeHandler;
}) {
  const { formData, step, onChange } = props;
  return (
    <div className="space-y-6">
      <ValidatedInput
        label="Education"
        field="education"
        step={step}
        value={formData.education}
        onValueChange={(v) => onChange("education", v)}
        placeholder="e.g. Bachelor's, Master's"
        required
      />

      <ValidatedInput
        label="Occupation"
        field="occupation"
        step={step}
        value={formData.occupation}
        onValueChange={(v) => onChange("occupation", v)}
        placeholder="Occupation"
        required
      />

      <ValidatedInput
        label="Annual Income"
        field="annualIncome"
        step={step}
        value={formData.annualIncome}
        onValueChange={(v) => onChange("annualIncome", v)}
        placeholder="e.g. £30,000"
      />

      <ValidatedTextarea
        label="About Me"
        field="aboutMe"
        step={step}
        value={formData.aboutMe}
        onValueChange={(v) => onChange("aboutMe", v)}
        placeholder="Tell us a little about yourself..."
        rows={4}
        required
      />
    </div>
  );
}

export function Step5PartnerPreferences(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: ChangeHandler;
  preferredCitiesInput: string;
  setPreferredCitiesInput: (v: string) => void;
}) {
  const { formData, step, onChange, preferredCitiesInput, setPreferredCitiesInput } = props;
  return (
    <div className="space-y-6">
      <ValidatedSelect
        label="Preferred Gender"
        field="preferredGender"
        step={step}
        value={formData.preferredGender}
        onValueChange={(v) => onChange("preferredGender", v)}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "any", label: "Any" },
          { value: "other", label: "Other" },
        ]}
        placeholder="Select preferred gender"
        required
      />

      <div>
        <Label className="text-gray-700 mb-2 block">Age Range</Label>
        <div className="flex gap-2 items-center">
          <ValidatedInput
            label="Min"
            field="partnerPreferenceAgeMin"
            step={step}
            value={formData.partnerPreferenceAgeMin !== undefined ? String(formData.partnerPreferenceAgeMin) : ""}
            type="number"
            onValueChange={(v) => onChange("partnerPreferenceAgeMin", v === "" ? "" : Number(v))}
            className="w-24"
            placeholder="18"
          />
          <span>to</span>
          <ValidatedInput
            label="Max"
            field="partnerPreferenceAgeMax"
            step={step}
            value={formData.partnerPreferenceAgeMax !== undefined ? String(formData.partnerPreferenceAgeMax) : ""}
            type="number"
            onValueChange={(v) => onChange("partnerPreferenceAgeMax", v === "" ? "" : Number(v))}
            className="w-24"
            placeholder="99"
          />
        </div>
      </div>

      <ValidatedInput
        label="Preferred Cities"
        field="partnerPreferenceCity"
        step={step}
        value={preferredCitiesInput}
        onValueChange={async (raw) => {
          const val = String(raw);
          setPreferredCitiesInput(val);
          try {
            const { parsePreferredCities } = await import("../profileCreationHelpers");
            const parsed = parsePreferredCities(val);
            onChange("partnerPreferenceCity", parsed);
          } catch {
            const parsed = val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange("partnerPreferenceCity", parsed);
          }
        }}
        placeholder="e.g. London, Kabul"
        hint="Comma-separated list"
      />
    </div>
  );
}

export function Step6Photos(props: {
  userId: string;
  pendingImages: ImageType[];
  setPendingImages: (imgs: ImageType[]) => void;
  onImagesChanged: (imgs: (string | ImageType)[]) => void;
}) {
  const { userId, pendingImages, setPendingImages, onImagesChanged } = props;
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Profile Photos</h3>
        <p className="text-sm text-gray-600">Add photos to your profile (optional)</p>
      </div>
      <div className="mb-6">
        <Label className="text-gray-700 mb-2 block">Profile Photos</Label>
        {/* Consumers should import LocalImageUpload directly in parent if needed */}
        {/* We keep the reorder preview here */}
        {pendingImages.length > 0 && (
          <div className="mt-4">
            <ProfileImageReorder
              preUpload
              images={pendingImages as ImageType[]}
              userId={userId || ""}
              loading={false}
              onReorder={async (ordered: ImageType[]) => {
                setPendingImages(ordered);
                try {
                  const ids = ordered.map((img) => img.id);
                  const { persistPendingImageOrderToLocal } = await import("../profileCreationHelpers");
                  persistPendingImageOrderToLocal(ids);
                } catch {}
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function Step7AccountCreation(props: {
  formData: ProfileCreationData;
  setStep: (n: number) => void;
  router: { push: (p: string) => void };
}) {
  const { formData, setStep, router } = props;
  const requiredFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "city",
    "aboutMe",
    "occupation",
    "education",
    "height",
    "maritalStatus",
    "phoneNumber",
  ];
  const missingFields = requiredFields.filter((field) => {
    const value = formData[field as keyof ProfileCreationData];
    return !value || (typeof value === "string" && value.trim() === "");
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Create Account</h3>
        <p className="text-sm text-gray-600">Finish and create your account</p>
      </div>
      <div className="space-y-4">
        {missingFields.length > 0 ? (
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 font-semibold mb-2">⚠️ Cannot create account - Profile incomplete</p>
            <p className="text-sm text-red-500 mb-4">
              You must complete all profile sections before creating an account.
            </p>
            <p className="text-xs text-red-400 mb-4">
              Missing: {missingFields.slice(0, 5).join(", ")}
              {missingFields.length > 5 && ` and ${missingFields.length - 5} more fields`}
            </p>
            <Button variant="outline" onClick={() => setStep(1)} className="border-red-300 text-red-600 hover:bg-red-50">
              Go back to complete profile
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Consumer renders CustomSignupForm in parent; keep structural parity */}
          </div>
        )}
      </div>
    </div>
  );
}
