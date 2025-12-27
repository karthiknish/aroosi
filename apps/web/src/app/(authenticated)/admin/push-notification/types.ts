export interface DeviceItem {
  userId: string;
  email: string | null;
  playerId: string;
  deviceType: string;
  deviceToken: string | null;
  isActive: boolean;
  registeredAt: number | null;
}

export type FilterItem =
  | {
      field: "tag";
      key: string;
      relation: "=" | "!=" | ">" | "<" | "exists" | "not_exists";
      value?: string;
    }
  | { field: "language" | "country"; relation: "=" | "!="; value: string }
  | { field: "last_session"; relation: ">" | "<"; hours_ago: number }
  | {
      field: "session_count" | "amount_spent";
      relation: "=" | "!=" | ">" | "<";
      value: number;
    }
  | { operator: "OR" };

export interface PushNotificationAnalytics {
  totalDevices: number;
  activeDevices: number;
  iosDevices: number;
  androidDevices: number;
  webDevices: number;
  recentNotifications: number;
}

export interface TemplateUI {
  id?: string;
  name: string;
  title: string;
  message: string;
  imageUrl?: string;
  category?: string;
  url?: string;
  dataJson?: string;
  buttonsJson?: string;
}

export interface PushNotificationTemplate {
  id: string;
  name: string;
  description?: string;
  payload: any;
  createdAt?: number;
  lastUsedAt?: number;
}

export const DEFAULT_TEMPLATE_CATEGORIES: Record<string, { name: string; title: string; message: string; imageUrl?: string }[]> = {
  "Re-engagement": [
    {
      name: "We miss you",
      title: "We miss you at Aroosi! 💕",
      message: "Come back and discover new matches waiting for you!",
      imageUrl: "/images/notifications/miss-you.png",
    },
    {
      name: "New matches",
      title: "New matches just landed! ✨",
      message: "Fresh profiles match your preferences. Check them out now!",
      imageUrl: "/images/notifications/new-matches.png",
    },
    {
      name: "Unfinished profile",
      title: "Finish your profile to get noticed 📸",
      message: "Complete a few more details to boost your visibility by 3x.",
    },
  ],
  "Feature launch": [
    {
      name: "Spotlight",
      title: "Shine with Spotlight ⭐",
      message: "Try the new Spotlight badge and get 5x more profile views.",
      imageUrl: "/images/notifications/spotlight.png",
    },
    {
      name: "Advanced search",
      title: "Advanced Search is here 🔍",
      message: "Filter by location, interests, and more to find better matches.",
    },
    {
      name: "Chat improvements",
      title: "A better chat experience 💬",
      message: "Voice messages, reactions, and more! Jump in and say hello!",
    },
  ],
  Promotion: [
    {
      name: "Limited-time offer",
      title: "Limited-time offer! 🎉",
      message: "Upgrade to Premium today and save 30% - only 24 hours left!",
      imageUrl: "/images/notifications/promotion.png",
    },
    {
      name: "Weekend sale",
      title: "Weekend sale: Premium perks 🛍️",
      message: "Unlock unlimited likes and Super Likes at 50% off this weekend.",
    },
    {
      name: "Referral",
      title: "Invite friends, get rewards 🎁",
      message: "Share Aroosi and get 1 month Premium free for each friend who joins.",
    },
  ],
  Onboarding: [
    {
      name: "Welcome",
      title: "Welcome to Aroosi! 🌟",
      message: "Set your preferences to get the best matches tailored for you.",
    },
    {
      name: "Upload photos",
      title: "Add your best photo 📷",
      message: "Profiles with photos get 10x more likes and messages.",
    },
    {
      name: "Set interests",
      title: "Tell us what you like ❤️",
      message: "Add interests so we can recommend better matches.",
    },
  ],
  "System & Updates": [
    {
      name: "Planned maintenance",
      title: "Scheduled maintenance 🔧",
      message: "Aroosi will be briefly unavailable tonight at 2:00 AM UTC for improvements.",
    },
    {
      name: "Service restored",
      title: "We're back online! ✅",
      message: "Thanks for your patience. All services are now restored and running smoothly.",
    },
    {
      name: "New features",
      title: "What's new this week 📱",
      message: "Check out the latest features and improvements in the app!",
    },
  ],
  Seasonal: [
    {
      name: "Holiday greetings",
      title: "Happy holidays from Aroosi! 🎄",
      message: "Wishing you joyful connections and love this holiday season!",
      imageUrl: "/images/notifications/holidays.png",
    },
    {
      name: "New Year",
      title: "New year, new connections! 🎊",
      message: "Start 2025 by meeting someone special on Aroosi.",
    },
    {
      name: "Valentine's Day",
      title: "Love is in the air! 💘",
      message: "Find your Valentine on Aroosi - special Premium offers inside!",
      imageUrl: "/images/notifications/valentines.png",
    },
  ],
};
