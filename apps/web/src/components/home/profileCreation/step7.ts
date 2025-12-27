// Helpers specific to Step 7 (Account Creation)

export function getGlobalRequiredFields(): string[] {
  return [
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
    "profileImageIds",
  ];
}

export interface RequiredFieldCheck {
  required: string[];
  missing: string[];
}

export function computeMissingRequiredFields(
  data: Record<string, unknown>,
  required: string[]
): RequiredFieldCheck {
  const missing = required.filter((k) => {
    const v = (data as any)[k];
    return (
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0)
    );
  });
  return { required, missing };
}

// Build Profile payload from cleaned data and known mappings
export function buildProfilePayload(
  cleanedData: Record<string, unknown>,
  normalizedPhone?: string
): Partial<import("@aroosi/shared/types").ProfileFormValues> {
  return {
    ...(cleanedData as unknown as import("@aroosi/shared/types").ProfileFormValues),
    profileFor: (cleanedData.profileFor ?? "self") as "self" | "friend" | "family",
    dateOfBirth: String(cleanedData.dateOfBirth ?? ""),
    partnerPreferenceCity: Array.isArray(cleanedData.partnerPreferenceCity)
      ? (cleanedData.partnerPreferenceCity as string[])
      : [],
    email: (cleanedData.email as string) || "",
    phoneNumber: normalizedPhone,
  };
}

// Normalize phone number to naive E.164-like (+digits) if possible. Otherwise return original string.
export function normalizePhoneE164Like(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Filter an object, dropping null/undefined/empty-string/empty-array values
export function filterEmptyValues<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keep =
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === "") &&
      !(Array.isArray(v) && v.length === 0);
    if (keep) (result as any)[k] = v;
  }
  return result;
}


