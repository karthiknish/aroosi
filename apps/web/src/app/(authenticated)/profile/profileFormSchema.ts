import * as z from "zod";

export function getProfileFormSchema(isOnboarding: boolean) {
  return z
    .object({
      fullName: isOnboarding
        ? z.string().min(2, "Full name is required")
        : z.string().optional().or(z.literal("")),
      dateOfBirth: isOnboarding
        ? z
            .string()
            .min(1, "Date of birth is required")
            .refine(
              (val) => {
                if (!val) return false;
                const dob = new Date(val);
                if (isNaN(dob.getTime())) return false;
                const today = new Date();
                const minDate = new Date(
                  today.getFullYear() - 18,
                  today.getMonth(),
                  today.getDate()
                );
                return dob <= minDate;
              },
              {
                message: "You must be at least 18 years old.",
              }
            )
        : z.string().optional().or(z.literal("")),
      gender: isOnboarding
        ? z.enum(["male", "female", "other"], {
            required_error: "Gender is required",
          })
        : z.enum(["male", "female", "other"]).optional(),
      city: isOnboarding
        ? z.string().min(1, "City is required")
        : z.string().optional().or(z.literal("")),
      country: z.string().max(10).optional().or(z.literal("")),
      height: z.string().max(20).optional().or(z.literal("")),
      maritalStatus: z
        .enum(["single", "divorced", "widowed", "annulled"])
        .optional(),
      education: z.string().max(100).optional().or(z.literal("")),
      occupation: z.string().max(100).optional().or(z.literal("")),
      annualIncome: z.preprocess(
        (val) =>
          val === "" ? undefined : typeof val === "string" ? Number(val) : val,
        z
          .number({ invalid_type_error: "Annual income must be a number." })
          .min(0, "Annual income must be a positive number.")
          .optional()
      ),
      aboutMe: isOnboarding
        ? z.string().min(1, "About Me is required")
        : z.string().optional().or(z.literal("")),
      partnerPreferenceAgeMin: z.preprocess(
        (val) => (val ? Number(val) : undefined),
        z.number().min(18).optional()
      ),
      partnerPreferenceAgeMax: z.preprocess(
        (val) => (val ? Number(val) : undefined),
        z.number().max(99).optional()
      ),
      partnerPreferenceCity: z.array(z.string()).optional(),
      preferredGender: z.enum(["male", "female", "non-binary", "other", "any"], {
        required_error: "Preferred gender is required",
      }),
      profileImageIds: z.array(z.string()).optional(),
      phoneNumber: z
        .string()
        .min(7, "Phone number is required")
        .regex(
          /^[+]?[\d\s-]{7,20}$/,
          "Enter a valid phone number (international or UK format)"
        )
        .optional()
        .or(z.literal("")),
      diet: z
        .enum(["vegetarian", "non-vegetarian", "vegan", "eggetarian", "other"])
        .optional(),
      smoking: z.enum(["no", "occasionally", "yes"]).optional(),
      drinking: z.enum(["no", "occasionally", "yes"]).optional(),
      physicalStatus: z
        .enum(["normal", "differently-abled", "other"])
        .optional(),
      religion: z.string().max(50).optional().or(z.literal("")),
      motherTongue: z.string().max(50).optional().or(z.literal("")),
      ethnicity: z.string().max(50).optional().or(z.literal("")),
    })
    .refine(
      (data) =>
        !data.partnerPreferenceAgeMin ||
        !data.partnerPreferenceAgeMax ||
        data.partnerPreferenceAgeMax >= data.partnerPreferenceAgeMin,
      {
        message:
          "Max preferred age must be greater than or equal to min preferred age.",
        path: ["partnerPreferenceAgeMax"],
      }
    );
}

export type ProfileFormValues = z.infer<
  ReturnType<typeof getProfileFormSchema>
>;
