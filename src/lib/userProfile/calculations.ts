import { UserProfile } from '@/lib/userProfile';

// More robust completion calculation with category weights and richer field validation.
// Weights sum to 100. Each category contributes proportionally to its internal completion ratio.
// Images treat >=1 as baseline requirement; >=3 grants full category credit.

interface CategorySpec {
  weight: number; // percentage weight
  fields: (keyof UserProfile)[];
  // Optional custom scorer (returns 0..1). If provided, fields array is informational only.
  scorer?: (profile: Partial<UserProfile>) => number;
  minRequired?: number; // minimum non-empty fields to count anything
}

const isNonEmpty = (v: any): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

const CATEGORIES: CategorySpec[] = [
  {
    weight: 30,
    fields: ['fullName','dateOfBirth','gender','maritalStatus','religion','aboutMe'],
    minRequired: 6,
  },
  {
    weight: 15,
    fields: ['city','country','motherTongue','ethnicity'],
    minRequired: 2,
  },
  {
    weight: 15,
    fields: ['education','occupation','annualIncome'],
    minRequired: 2,
  },
  {
    weight: 10,
    fields: ['height','diet','smoking','drinking','physicalStatus'],
    minRequired: 2,
  },
  {
    weight: 15,
    fields: ['hobbies','interests'],
    minRequired: 1,
  },
  {
    weight: 15,
    fields: ['profileImageUrls'],
    scorer: (p) => {
      const imgs = Array.isArray(p.profileImageUrls) ? p.profileImageUrls.filter(isNonEmpty) : [];
      if (imgs.length === 0) return 0; // no images => 0
      if (imgs.length >= 3) return 1; // 3+ images => full credit
      return 0.6; // 1-2 images => partial credit
    },
  },
];

export function calculateProfileCompletion(
  profile: Partial<UserProfile>
): number {
  let total = 0;
  for (const cat of CATEGORIES) {
    let ratio = 0;
    if (cat.scorer) {
      ratio = cat.scorer(profile);
    } else {
      const present = cat.fields.filter((f) =>
        isNonEmpty((profile as any)[f])
      ).length;
      if (cat.minRequired && present === 0) {
        ratio = 0;
      } else {
        ratio = present / cat.fields.length;
      }
    }
    total += ratio * cat.weight;
  }
  // Clamp and round
  return Math.min(100, Math.max(0, Math.round(total)));
}

// Helper to derive onboarding completion from same core required subset (single source of truth)
// Canonical list of required fields for declaring onboarding complete.
// Keep this single source of truth in sync with UI onboarding forms.
export const ONBOARDING_REQUIRED_FIELDS: (keyof UserProfile)[] = [
  'fullName',
  'dateOfBirth',
  'gender',
  'profileFor',
  'phoneNumber',
  'country',
  'city',
  'maritalStatus',
  'education',
  'occupation',
  'religion',
  'aboutMe',
  // height handled specially (height or heightCm acceptable)
];

export function isOnboardingEssentialComplete(
  profile: Partial<UserProfile>
): boolean {
  // All listed fields must be non-empty except height which we check separately.
  for (const f of ONBOARDING_REQUIRED_FIELDS) {
    if (!isNonEmpty((profile as any)[f])) return false;
  }
  // Height acceptance: textual height OR numeric heightCm.
  const hasHeight =
    isNonEmpty((profile as any).height) ||
    isNonEmpty((profile as any).heightCm);
  if (!hasHeight) return false;
  return true;
}
