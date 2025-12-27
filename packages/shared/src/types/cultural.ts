// Cultural and Religious Matching Types
// Source of truth shared between web and mobile.

export type Religion =
    | 'islam'
    | 'hinduism'
    | 'christianity'
    | 'sikhism'
    | 'buddhism'
    | 'jainism'
    | 'judaism'
    | 'bahai'
    | 'other'
    | '';

export type ReligiousPractice =
    | 'practicing'
    | 'moderately_practicing'
    | 'not_practicing'
    | 'cultural'
    | '';

export type FamilyValues =
    | 'traditional'
    | 'modern'
    | 'mixed'
    | 'liberal'
    | 'conservative'
    | 'progressive'
    | '';

export type MarriageViews =
    | 'arranged'
    | 'love'
    | 'arranged_love'
    | 'open_to_both'
    | 'traditional_courtship'
    | '';

export type TraditionalValues =
    | 'very_important'
    | 'important'
    | 'somewhat_important'
    | 'not_important'
    | 'flexible'
    | '';

export type FamilyRelationship =
    | 'father'
    | 'mother'
    | 'brother'
    | 'sister'
    | 'uncle'
    | 'aunt'
    | 'grandfather'
    | 'grandmother'
    | 'cousin'
    | 'guardian'
    | 'other';

export type FamilyApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export type SupervisedConversationStatus =
    | 'initiated'
    | 'approved'
    | 'active'
    | 'paused'
    | 'ended'
    | 'rejected';

export interface CulturalProfile {
    _id?: string;
    userId: string;
    religion: Religion;
    religiousPractice: ReligiousPractice;
    motherTongue: string;
    languages: string[];
    familyValues: FamilyValues;
    marriageViews: MarriageViews;
    traditionalValues: TraditionalValues;
    importanceOfReligion: number;
    importanceOfCulture: number;
    familyBackground?: string;
    createdAt: number;
    updatedAt: number;
}

export interface FamilyApprovalRequest {
    _id?: string;
    requesterId: string;
    familyMemberId: string;
    relationship: FamilyRelationship;
    message: string;
    status: FamilyApprovalStatus;
    responseMessage?: string;
    responseTimestamp?: number;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
}

export interface SupervisedConversation {
    _id?: string;
    requesterId: string;
    targetUserId: string;
    supervisorId: string;
    status: SupervisedConversationStatus;
    conversationId?: string;
    guidelines?: string[];
    startedAt?: number;
    endedAt?: number;
    createdAt: number;
    updatedAt: number;
}

export interface CulturalCompatibilityScore {
    overall: number;
    factors: {
        religion: { score: number; weight: number; explanation: string };
        language: { score: number; weight: number; explanation: string };
        culture: { score: number; weight: number; explanation: string };
        family: { score: number; weight: number; explanation: string };
    };
    insights: string[];
    recommendations: string[];
}

export interface CulturalMatchRecommendation {
    userId: string;
    compatibilityScore: number;
    matchingFactors: string[];
    culturalHighlights: string[];
    profile: any;
}

export interface CulturalProfileResponse {
    success: boolean;
    profile?: CulturalProfile;
    error?: string;
}

export interface FamilyApprovalResponse {
    success: boolean;
    request?: FamilyApprovalRequest;
    requests?: FamilyApprovalRequest[];
    error?: string;
}

export interface SupervisedConversationResponse {
    success: boolean;
    conversation?: SupervisedConversation;
    conversations?: SupervisedConversation[];
    error?: string;
}

export interface CompatibilityResponse {
    success: boolean;
    compatibility?: CulturalCompatibilityScore;
    error?: string;
}

export interface RecommendationsResponse {
    success: boolean;
    recommendations?: CulturalMatchRecommendation[];
    error?: string;
}

export const RELIGIONS: Record<Religion, string> = {
    islam: 'Islam',
    hinduism: 'Hinduism',
    christianity: 'Christianity',
    sikhism: 'Sikhism',
    buddhism: 'Buddhism',
    jainism: 'Jainism',
    judaism: 'Judaism',
    bahai: "Bahá'í Faith",
    other: 'Other',
    '': 'Prefer not to say',
};

export const RELIGIOUS_PRACTICES: Record<ReligiousPractice, string> = {
    practicing: 'Practicing',
    moderately_practicing: 'Moderately Practicing',
    not_practicing: 'Not Practicing',
    cultural: 'Cultural Only',
    '': 'Prefer not to say',
};

export const FAMILY_VALUES: Record<FamilyValues, string> = {
    traditional: 'Traditional',
    modern: 'Modern',
    mixed: 'Mixed',
    liberal: 'Liberal',
    conservative: 'Conservative',
    progressive: 'Progressive',
    '': 'Prefer not to say',
};

export const MARRIAGE_VIEWS: Record<MarriageViews, string> = {
    arranged: 'Arranged Marriage',
    love: 'Love Marriage',
    arranged_love: 'Arranged Love Marriage',
    open_to_both: 'Open to Both',
    traditional_courtship: 'Traditional Courtship',
    '': 'Prefer not to say',
};

export const TRADITIONAL_VALUES: Record<TraditionalValues, string> = {
    very_important: 'Very Important',
    important: 'Important',
    somewhat_important: 'Somewhat Important',
    not_important: 'Not Important',
    flexible: 'Flexible',
    '': 'Prefer not to say',
};

export const FAMILY_RELATIONSHIPS: Record<FamilyRelationship, string> = {
    father: 'Father',
    mother: 'Mother',
    brother: 'Brother',
    sister: 'Sister',
    uncle: 'Uncle',
    aunt: 'Aunt',
    grandfather: 'Grandfather',
    grandmother: 'Grandmother',
    cousin: 'Cousin',
    guardian: 'Guardian',
    other: 'Other Family Member',
};
