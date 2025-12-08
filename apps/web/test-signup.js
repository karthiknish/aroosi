const { z } = require("zod");

/**
 * Profile schema with stronger server-side validation, to log precise errors for 400s
 */
const profileSchema = z
  .object({
    fullName: z.string().min(1, "fullName is required"),
    dateOfBirth: z
      .string()
      .min(1, "dateOfBirth is required"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "gender is required" }),
    }),
    city: z.string().min(1, "city is required"),
    aboutMe: z.string().min(1, "aboutMe is required"),
    occupation: z.string().min(1, "occupation is required"),
    education: z.string().min(1, "education is required"),
    height: z
      .string()
      .min(1, "height is required"),
    maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"], {
      errorMap: () => ({ message: "maritalStatus is required" }),
    }),
    phoneNumber: z
      .string()
      .min(1, "phoneNumber is required"),

    profileFor: z
      .enum([
        "self",
        "son",
        "daughter",
        "brother",
        "sister",
        "friend",
        "relative",
        "",
      ])
      .optional(),
    country: z.string().optional(),
    annualIncome: z.union([z.string(), z.number()]).optional(),
    email: z.string().email().optional(),
    profileImageIds: z.array(z.string()).optional(),
    isProfileComplete: z.boolean().optional(),
    preferredGender: z.enum(["male", "female", "other", "any"]).optional(),
    motherTongue: z
      .enum([
        "farsi-dari",
        "pashto",
        "uzbeki",
        "hazaragi",
        "turkmeni",
        "balochi",
        "nuristani",
        "punjabi",
        "",
      ])
      .optional(),
    religion: z.enum(["muslim", "hindu", "sikh", ""], { message: "Invalid religion" }).optional(),
    ethnicity: z
      .enum([
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
        "",
      ])
      .optional(),
    diet: z
      .enum([
        "vegetarian",
        "non-vegetarian",
        "halal",
        "vegan",
        "eggetarian",
        "other",
        "",
      ])
      .optional(),
    physicalStatus: z.enum(["normal", "differently-abled", ""], { message: "Invalid physicalStatus" }).optional(),
    smoking: z.enum(["no", "occasionally", "yes", ""], { message: "Invalid smoking" }).optional(),
    drinking: z.enum(["no", "occasionally", "yes"], { message: "Invalid drinking" }).optional(),
    partnerPreferenceAgeMin: z.number().optional(),
    partnerPreferenceAgeMax: z.number().optional(),
    partnerPreferenceCity: z.array(z.string()).optional(),
    subscriptionPlan: z.enum(["free", "premium", "premiumPlus"], { message: "Invalid subscriptionPlan" }).optional(),
  });

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  profile: profileSchema,
});

// Test data
const testData = {
  email: "test@example.com",
  password: "Password123!",
  fullName: "Test User",
  profile: {
    fullName: "Test User",
    dateOfBirth: "1990-01-01",
    gender: "male",
    city: "Test City",
    aboutMe: "This is a test user for development purposes",
    occupation: "Software Developer",
    education: "Bachelor's Degree",
    height: "180 cm",
    maritalStatus: "single",
    phoneNumber: "+1234567890",
    country: "USA",
    isProfileComplete: true
  }
};

// Validate the test data
try {
  const parsed = signupSchema.parse(testData);
  console.log("Test data is valid:", parsed);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation errors:");
    error.errors.forEach(err => {
      console.error(`  ${err.path.join(".")}: ${err.message}`);
    });
  } else {
    console.error("Unexpected error:", error);
  }
  process.exit(1);
}

console.log("\nTo test the signup API, run this curl command:");
console.log(`
curl -X POST http://localhost:3000/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData, null, 2)}'
`);