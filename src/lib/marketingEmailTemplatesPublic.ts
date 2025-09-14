// Public map exposing template metadata for admin catalog
export const TEMPLATE_MAP: Record<string, { label: string; category?: string; argsDoc?: string }> = {
  profileCompletionReminder: {
    label: "Profile Completion Reminder",
    category: "engagement",
    argsDoc: "args: [completionPercentage:number]",
  },
  premiumPromo: {
    label: "Premium Promotion",
    category: "promotion",
    argsDoc: "args: [discountPercentage:number]",
  },
  recommendedProfiles: {
    label: "Recommended Profiles",
    category: "engagement",
    argsDoc: "args: [recommendations:Array<ProfileSummary>]",
  },
  reEngagement: {
    label: "Re-Engagement",
    category: "engagement",
    argsDoc: "args: [daysSinceLastLogin:number]",
  },
  successStory: {
    label: "Success Story",
    category: "brand",
    argsDoc: "args: [storyTitle:string, storyPreview:string]",
  },
  weeklyDigest: {
    label: "Weekly Matches Digest",
    category: "digest",
    argsDoc: "args: [matchCount:number]",
  },
  welcomeDay1: {
    label: "Welcome Day 1",
    category: "onboarding",
  },
  builder: {
    label: "Template Builder",
    category: "builder",
    argsDoc: "params.schema: BuilderSchema",
  },
};


