import { z } from "zod";

// Age validation helper
export const validateAge = (dateString: string): boolean => {
  if (!dateString) return false;

  const birthDate = new Date(dateString);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    return age - 1 >= 18;
  }

  return age >= 18;
};

// Height validation helper
export const validateHeight = (heightString: string): boolean => {
  if (!heightString) return false;

  // Auto-append " cm" if user selects just a number
  if (/^\d{2,3}$/.test(heightString)) {
    heightString = `${heightString} cm`;
  }

  const cmPattern = /^\d{2,3}\s*cm$/i;
  const feetPattern = /^[4-7]'([0-9]|1[01])"?$/;
  const feetInchesPattern = /^[4-7]\s*ft\s*([0-9]|1[01])\s*in$/i;
  const fullFormat = /^[4-7]'([0-9]|1[01])"?\s*\(\d{2,3}\s*cm\)$/i;

  return (
    cmPattern.test(heightString) ||
    feetPattern.test(heightString) ||
    feetInchesPattern.test(heightString) ||
    fullFormat.test(heightString)
  );
};

// Phone number normalization to E.164-like format (+ and digits only).
// Returns normalized "+<digits>" if length between 10 and 15, else null.
export const normalizeToE164 = (phone: string): string | null => {
  if (!phone) return null;
  // Keep leading +, strip all other non-digits
  const cleaned = phone.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
};

// Phone number validation helper (accept varied input but validate canonical length)
export const validatePhoneNumber = (phone: string): boolean => {
  const normalized = normalizeToE164(phone);
  return normalized !== null;
};

// Name validation helper
export const validateName = (name: string): boolean => {
  if (!name) return false;

  // Allow letters, spaces, hyphens, and apostrophes
  const namePattern = /^[a-zA-Z\s\-']+$/;
  return namePattern.test(name.trim()) && name.trim().length >= 2;
};

// Error message templates
export const errorMessages = {
  required: (fieldName: string) => `${fieldName} is required`,
  minLength: (fieldName: string, min: number) =>
    `${fieldName} must be at least ${min} characters`,
  maxLength: (fieldName: string, max: number) =>
    `${fieldName} cannot exceed ${max} characters`,
  format: (fieldName: string, format: string) =>
    `${fieldName} must be in ${format} format`,
  age: () => "You must be at least 18 years old",
  height: () => 'Please enter height in format like "170 cm" or "5\'8"',
  phone: () => "Please enter a valid phone number with at least 10 digits",
  name: () => "Name can only contain letters, spaces, hyphens, and apostrophes",
  email: () => "Please enter a valid email address",
  network: () => "Connection error. Please check your internet and try again.",
  server: () => "Server error. Please try again in a few moments.",
  auth: () => "Authentication expired. Please sign in again.",
};

// Field display names for better error messages
export const fieldDisplayNames: Record<string, string> = {
  profileFor: "Profile type",
  gender: "Gender",
  fullName: "Full name",
  dateOfBirth: "Date of birth",
  phoneNumber: "Phone number",
  country: "Country",
  city: "City",
  height: "Height",
  maritalStatus: "Marital status",
  physicalStatus: "Physical status",
  motherTongue: "Mother tongue",
  religion: "Religion",
  ethnicity: "Ethnicity",
  diet: "Diet preference",
  smoking: "Smoking preference",
  drinking: "Drinking preference",
  education: "Education",
  occupation: "Occupation",
  annualIncome: "Annual income",
  aboutMe: "About me",
  preferredGender: "Preferred gender",
  partnerPreferenceAgeMin: "Minimum age preference",
  partnerPreferenceAgeMax: "Maximum age preference",
  partnerPreferenceCity: "Preferred cities",
};

// Enhanced validation schemas with detailed error messages
export const enhancedValidationSchemas = {
  // Step 1: Basic Info
  basicInfo: z.object({
    profileFor: z.enum(["self", "friend", "family"], {
      errorMap: () => ({
        message: errorMessages.required(fieldDisplayNames.profileFor),
      }),
    }),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({
        message: errorMessages.required(fieldDisplayNames.gender),
      }),
    }),
    fullName: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.fullName))
      .min(2, errorMessages.minLength(fieldDisplayNames.fullName, 2))
      .max(50, errorMessages.maxLength(fieldDisplayNames.fullName, 50))
      .refine(validateName, errorMessages.name()),
    dateOfBirth: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.dateOfBirth))
      .refine(validateAge, errorMessages.age()),
    phoneNumber: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.phoneNumber))
      .transform((v) => (normalizeToE164(v) ?? v))
      .refine((v) => validatePhoneNumber(v), errorMessages.phone()),
  }),

  // Step 2: Location & Physical
  location: z.object({
    country: z.string().optional(),
    city: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.city))
      .max(50, errorMessages.maxLength(fieldDisplayNames.city, 50)),
    height: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.height))
      .refine(validateHeight, errorMessages.height()),
    maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"], {
      errorMap: () => ({
        message: errorMessages.required(fieldDisplayNames.maritalStatus),
      }),
    }),
    physicalStatus: z.enum(["normal", "differently-abled", ""]).optional(),
  }),

  // Step 3: Cultural & Lifestyle
  cultural: z.object({
    motherTongue: z.string().optional(),
    religion: z.string().optional(),
    ethnicity: z.string().optional(),
    diet: z.string().optional(),
    smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
    drinking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  }),

  // Step 4: Education & Career
  education: z.object({
    education: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.education))
      .max(100, errorMessages.maxLength(fieldDisplayNames.education, 100)),
    occupation: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.occupation))
      .max(100, errorMessages.maxLength(fieldDisplayNames.occupation, 100)),
    // Expect a currency symbol and numeric amount with optional grouping and decimals.
    // Examples: "$30,000", "£45,500.00", "€120000", "₹2,50,000.50", "₹ 2,50,000"
    annualIncome: z
      .string()
      .regex(
        // Pattern notes:
        // - Optional single non-digit currency symbol at start (₹ $ € £ etc.), optionally with a space
        // - Amount can be grouped either as 1,234,567 or Indian style 12,34,567
        // - Allows plain digits without separators too
        // - Optional decimal part with 1-2 digits
        /^(?:[^\d\s])?\s*(?:\d{1,3}(?:,\d{2,3})+|\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/i,
        "Enter an amount with a currency symbol, e.g. $45,500.00 or ₹2,50,000"
      )
      .optional(),
    aboutMe: z
      .string()
      .min(1, errorMessages.required(fieldDisplayNames.aboutMe))
      .min(10, errorMessages.minLength(fieldDisplayNames.aboutMe, 10))
      .max(500, errorMessages.maxLength(fieldDisplayNames.aboutMe, 500)),
  }),

  // Step 5: Partner Preferences (base schema)
  preferencesBase: z.object({
    preferredGender: z.enum(["male", "female", "any", "other"], {
      errorMap: () => ({
        message: errorMessages.required(fieldDisplayNames.preferredGender),
      }),
    }),
    partnerPreferenceAgeMin: z
      .number()
      .min(18, "Minimum age must be at least 18")
      .max(99, "Minimum age cannot exceed 99")
      .optional(),
    partnerPreferenceAgeMax: z
      .number()
      .min(18, "Maximum age must be at least 18")
      .max(99, "Maximum age cannot exceed 99")
      .optional(),
    partnerPreferenceCity: z.array(z.string()).optional(),
  }),

  // Step 5: Partner Preferences (with validation)
  preferences: z
    .object({
      preferredGender: z.enum(["male", "female", "any", "other"], {
        errorMap: () => ({
          message: errorMessages.required(fieldDisplayNames.preferredGender),
        }),
      }),
      partnerPreferenceAgeMin: z
        .number()
        .min(18, "Minimum age must be at least 18")
        .max(99, "Minimum age cannot exceed 99")
        .optional(),
      partnerPreferenceAgeMax: z
        .number()
        .min(18, "Maximum age must be at least 18")
        .max(99, "Maximum age cannot exceed 99")
        .optional(),
      partnerPreferenceCity: z.array(z.string()).optional(),
    })
    .refine(
      (data) => {
        if (data.partnerPreferenceAgeMin && data.partnerPreferenceAgeMax) {
          return data.partnerPreferenceAgeMin <= data.partnerPreferenceAgeMax;
        }
        return true;
      },
      {
        message: "Minimum age cannot be greater than maximum age",
        path: ["partnerPreferenceAgeMin"],
      }
    ),

  // Step 6: Photos
  photos: z.object({
    profileImageIds: z.array(z.string()).optional(),
  }),

  // Step 7: Account Creation
  account: z.object({
    email: z
      .string()
      .min(1, errorMessages.required("Email"))
      .email(errorMessages.email())
      .optional(),
  }),
};

// Combined schema for final validation
export const completeProfileSchema = z.object({
  // Required fields from all steps
  profileFor: enhancedValidationSchemas.basicInfo.shape.profileFor,
  gender: enhancedValidationSchemas.basicInfo.shape.gender,
  fullName: enhancedValidationSchemas.basicInfo.shape.fullName,
  dateOfBirth: enhancedValidationSchemas.basicInfo.shape.dateOfBirth,
  phoneNumber: enhancedValidationSchemas.basicInfo.shape.phoneNumber,
  city: enhancedValidationSchemas.location.shape.city,
  height: enhancedValidationSchemas.location.shape.height,
  maritalStatus: enhancedValidationSchemas.location.shape.maritalStatus,
  education: enhancedValidationSchemas.education.shape.education,
  occupation: enhancedValidationSchemas.education.shape.occupation,
  aboutMe: enhancedValidationSchemas.education.shape.aboutMe,
  preferredGender:
    enhancedValidationSchemas.preferencesBase.shape.preferredGender,

  // Optional fields
  country: enhancedValidationSchemas.location.shape.country,
  physicalStatus: enhancedValidationSchemas.location.shape.physicalStatus,
  motherTongue: enhancedValidationSchemas.cultural.shape.motherTongue,
  religion: enhancedValidationSchemas.cultural.shape.religion,
  ethnicity: enhancedValidationSchemas.cultural.shape.ethnicity,
  diet: enhancedValidationSchemas.cultural.shape.diet,
  smoking: enhancedValidationSchemas.cultural.shape.smoking,
  drinking: enhancedValidationSchemas.cultural.shape.drinking,
  annualIncome: enhancedValidationSchemas.education.shape.annualIncome,
  partnerPreferenceAgeMin:
    enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceAgeMin,
  partnerPreferenceAgeMax:
    enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceAgeMax,
  partnerPreferenceCity:
    enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceCity,
  profileImageIds: enhancedValidationSchemas.photos.shape.profileImageIds,
});

// Step-to-schema mapping
export const stepSchemaMapping = {
  1: enhancedValidationSchemas.basicInfo,
  2: enhancedValidationSchemas.location,
  3: enhancedValidationSchemas.cultural,
  4: enhancedValidationSchemas.education,
  5: enhancedValidationSchemas.preferences,
  6: enhancedValidationSchemas.photos,
  7: enhancedValidationSchemas.account,
};

// Validation utility functions
export const validateField = (
  field: string,
  value: unknown,
  step: number
): { isValid: boolean; error?: string } => {
  const schema = stepSchemaMapping[step as keyof typeof stepSchemaMapping];

  // If no schema, treat as valid
  if (!schema || !(schema instanceof z.ZodObject)) {
    // If value is empty, return required error if field is known
    if (value === undefined || value === null || value === "") {
      const displayName = fieldDisplayNames[field] || field;
      return { isValid: false, error: errorMessages.required(displayName) };
    }
    return { isValid: true };
  }

  const fieldSchema = schema.shape[field as keyof typeof schema.shape];
  // If no field schema, check for required error
  if (!fieldSchema || typeof (fieldSchema as any).safeParse !== "function") {
    if (value === undefined || value === null || value === "") {
      const displayName = fieldDisplayNames[field] || field;
      return { isValid: false, error: errorMessages.required(displayName) };
    }
    return { isValid: true };
  }

  const result = (fieldSchema as z.ZodTypeAny).safeParse(value);

  if (result.success) {
    return { isValid: true };
  } else {
    // If the value is empty, show required error
    if (value === undefined || value === null || value === "") {
      const displayName = fieldDisplayNames[field] || field;
      return { isValid: false, error: errorMessages.required(displayName) };
    }
    // Otherwise, show the specific Zod error message or a fallback
    let error = result.error.errors[0]?.message;
    if (!error || error === "Invalid value" || error === "") {
      if (fieldDisplayNames[field]) {
        error = errorMessages.format(fieldDisplayNames[field], "valid");
      } else {
        error = "Please enter a valid value.";
      }
    }
    return { isValid: false, error };
  }
};

export const validateStep = (
  data: Record<string, unknown>,
  step: number
): { isValid: boolean; errors: Record<string, string> } => {
  const schema = stepSchemaMapping[step as keyof typeof stepSchemaMapping];

  if (!schema) {
    return { isValid: true, errors: {} };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, errors: {} };
  } else {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((error) => {
      if (error.path[0]) {
        errors[String(error.path[0])] = error.message;
      }
    });
    return { isValid: false, errors };
  }
};

export const getRequiredFields = (step: number): string[] => {
  const schema = stepSchemaMapping[step as keyof typeof stepSchemaMapping];

  if (!schema || !(schema instanceof z.ZodObject)) {
    return [];
  }

  const requiredFields: string[] = [];
  const shape = schema.shape;

  Object.keys(shape).forEach((key) => {
    const fieldSchema = shape[key as keyof typeof shape];
    if (!fieldSchema || typeof (fieldSchema as any).safeParse !== "function") {
      return;
    }
    // Check if field is optional by trying to parse undefined
    const testResult = (fieldSchema as z.ZodTypeAny).safeParse(undefined);
    if (!testResult.success) {
      requiredFields.push(key);
    }
  });

  return requiredFields;
};
