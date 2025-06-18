export interface User {
  id: string;
  clerkId: string;
  email: string;
  profile?: Profile;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  profileFor: 'self' | 'friend' | 'family';
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  ukCity: string;
  ukPostcode?: string;
  aboutMe: string;
  religion?: string;
  occupation: string;
  education: string;
  height: string;
  maritalStatus: 'single' | 'divorced' | 'widowed' | 'annulled';
  smoking: 'no' | 'occasionally' | 'yes' | '';
  drinking: 'no' | 'occasionally' | 'yes';
  diet?: string;
  physicalStatus?: string;
  annualIncome?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceUkCity?: string;
  preferredGender?: 'male' | 'female' | 'other';
  profileImageIds: string[];
  isProfileComplete: boolean;
  isApproved?: boolean;
  hiddenFromSearch?: boolean;
  hideFromFreeUsers?: boolean;
  subscriptionPlan?: 'free' | 'premium' | 'premiumPlus';
  subscriptionExpiresAt?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Profile: Profile;
  user2Profile: Profile;
  status: 'pending' | 'matched' | 'blocked';
  createdAt: string;
  lastActivity?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface Interest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromProfile: Profile;
  toProfile: Profile;
  status: 'sent' | 'received' | 'matched' | 'declined';
  createdAt: string;
}

export interface SearchFilters {
  ageMin?: number;
  ageMax?: number;
  city?: string;
  preferredGender?: 'male' | 'female' | 'other' | 'any';
  religion?: string;
  education?: string;
  occupation?: string;
  maritalStatus?: string;
  smoking?: string;
  drinking?: string;
}

export interface Subscription {
  plan: 'free' | 'premium' | 'premiumPlus';
  expiresAt?: string;
  features: {
    unlimitedLikes: boolean;
    seeWhoLikedYou: boolean;
    advancedFilters: boolean;
    prioritySupport: boolean;
    profileBoost: boolean;
    readReceipts: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'match' | 'message' | 'interest' | 'profile_view' | 'subscription';
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export interface RootStackParamList {
  index: undefined;
  'sign-up': undefined;
  '(tabs)': undefined;
  'profile-setup': { step?: number };
  chat: { matchId: string };
  'profile-detail': { profileId: string };
  subscription: undefined;
  settings: undefined;
}

export interface TabsParamList {
  search: undefined;
  matches: undefined;
  profile: undefined;
  premium: undefined;
}