export const AGE_RANGES = [
  { label: "18-25", min: 18, max: 25 },
  { label: "26-30", min: 26, max: 30 },
  { label: "31-35", min: 31, max: 35 },
  { label: "36-40", min: 36, max: 40 },
  { label: "41+", min: 41, max: 100 },
];

export const EDUCATION_LEVELS = [
  { value: "high_school", label: "High School" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "phd", label: "PhD" },
  { value: "professional", label: "Professional Degree" },
  { value: "trade_school", label: "Trade School" },
  { value: "other", label: "Other" },
];

export const RELATIONSHIP_TYPES = [
  { value: "marriage", label: "Marriage" },
  { value: "friendship", label: "Friendship" },
  { value: "professional", label: "Professional" },
];

export const PRAYER_LEVELS = [
  { value: "very_religious", label: "Very Religious" },
  { value: "moderately_religious", label: "Moderately Religious" },
  { value: "somewhat_religious", label: "Somewhat Religious" },
  { value: "not_religious", label: "Not Religious" },
];

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: ["Basic profile", "Limited messaging", "Basic search"],
    popular: false,
  },
  PREMIUM: {
    name: "Premium",
    price: 1499, // £14.99 in pence
    priceId: "price_premium",
    features: ["Unlimited messaging", "Advanced search", "Profile boost"],
    popular: true,
  },
  PREMIUM_PLUS: {
    name: "Premium Plus",
    price: 3999, // £39.99 in pence
    priceId: "price_premium_plus",
    features: [
      "All Premium features",
      "Priority support",
      "Enhanced visibility",
    ],
    popular: false,
  },
};
