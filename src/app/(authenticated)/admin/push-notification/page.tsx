"use client";

import { useMemo, useState, useEffect } from "react";
import { sendPushNotification } from "@/lib/pushNotificationApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Smartphone,
  Send,
  Eye,
  Users,
  TestTube,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Save,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

interface DeviceItem {
  userId: string;
  email: string | null;
  playerId: string;
  deviceType: string;
  deviceToken: string | null;
  isActive: boolean;
  registeredAt: number | null;
}

export default function PushNotificationAdminPage() {
  // Cookie-auth; no token in context
  useAuthContext();
  // Tabs navigation
  const [activeTab, setActiveTab] = useState<
    "compose" | "devices" | "test" | "templates"
  >("compose");

  // Notification form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dataJson, setDataJson] = useState(
    '{\n  "type": "system_notification"\n}'
  );
  const [buttonsJson, setButtonsJson] = useState(
    '[\n  { "id": "view", "text": "View" }\n]'
  );
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [segments, setSegments] = useState<string[]>(["Subscribed Users"]);
  const [excludedSegments, setExcludedSegments] = useState<string[]>([]);
  const [maxAudience, setMaxAudience] = useState<number>(100000);
  const [confirmLive, setConfirmLive] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Re-engagement");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [delayedOption, setDelayedOption] = useState<
    "immediate" | "timezone" | "last-active"
  >("immediate");
  const [deliveryTimeOfDay, setDeliveryTimeOfDay] = useState("");
  const [throttlePerMinute, setThrottlePerMinute] = useState<number>(0);
  const [androidChannelId, setAndroidChannelId] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "custom">(
    "normal"
  );
  const [customPriority, setCustomPriority] = useState<number>(5);
  const [ttl, setTtl] = useState<number>(0);
  const [collapseId, setCollapseId] = useState("");
  const [iosBadgeType, setIosBadgeType] = useState<
    "None" | "SetTo" | "Increase"
  >("None");
  const [iosBadgeCount, setIosBadgeCount] = useState<number>(0);
  const [iosSound, setIosSound] = useState("");
  const [androidSound, setAndroidSound] = useState("");
  const [iosInterruptionLevel, setIosInterruptionLevel] = useState<
    "active" | "passive" | "time-sensitive" | "critical" | ""
  >("");
  const [mutableContent, setMutableContent] = useState(false);
  const [contentAvailable, setContentAvailable] = useState(false);
  const [includePlayerIds, setIncludePlayerIds] = useState<string>("");
  const [includeExternalUserIds, setIncludeExternalUserIds] =
    useState<string>("");
  // Track applied saved template id for lastUsedAt updates on live send
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null
  );
  // Filters builder state
  type FilterItem =
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
  const [filters, setFilters] = useState<FilterItem[]>([]);

  // Saved templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  // Device management state
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [devicePage, setDevicePage] = useState(1);
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
    new Set()
  );

  // Test notification state
  const [testPlayerId, setTestPlayerId] = useState("");
  const [testSending, setTestSending] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalDevices: 0,
    activeDevices: 0,
    iosDevices: 0,
    androidDevices: 0,
    webDevices: 0,
    recentNotifications: 0,
  });

  const devicePageSize = 20;

  // Helpers
  const safeParseJSON = (text: string): any => {
    try {
      const t = (text || "").trim();
      if (!t) return undefined;
      return JSON.parse(t);
    } catch {
      showErrorToast(null, "Invalid JSON in custom data/buttons");
      return undefined;
    }
  };

  // Fetch devices
  const fetchDevices = async (override?: {
    search?: string;
    page?: number;
  }) => {
    setDevicesLoading(true);
    try {
      const params = new URLSearchParams();
      const s = override?.search ?? deviceSearch;
      const p = override?.page ?? devicePage;
      if (s.trim()) params.set("search", s.trim());
      params.set("page", String(p));
      params.set("pageSize", String(devicePageSize));

      const res = await fetch(
        `/api/admin/push-notification/devices?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch devices");

      const data = await res.json();
      setDevices(data?.data?.items ?? []);
      setDeviceTotal(data?.data?.total ?? 0);

      // Update analytics
      const items = data?.data?.items ?? [];
      setAnalytics((prev) => ({
        ...prev,
        totalDevices: data?.data?.total ?? 0,
        activeDevices: items.filter((d: DeviceItem) => d.isActive).length,
        iosDevices: items.filter((d: DeviceItem) => d.deviceType === "ios")
          .length,
        androidDevices: items.filter(
          (d: DeviceItem) => d.deviceType === "android"
        ).length,
        webDevices: items.filter((d: DeviceItem) => d.deviceType === "web")
          .length,
      }));
    } catch (e) {
      console.error(e);
      showErrorToast(null, "Failed to fetch devices");
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [devicePage]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if (!dryRun && !confirmLive) return;

    setSending(true);
    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        url: url.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        dryRun,
        confirm: !dryRun && confirmLive,
        audience: segments,
        excludedSegments,
        includePlayerIds: includePlayerIds
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        includeExternalUserIds: includeExternalUserIds
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        data: safeParseJSON(dataJson),
        buttons: safeParseJSON(buttonsJson),
        filters: filters.length ? filters : undefined,
        maxAudience,
        delayedOption,
        sendAfter: isScheduled ? scheduledTime : undefined,
        deliveryTimeOfDay:
          delayedOption === "timezone" ? deliveryTimeOfDay : undefined,
        throttlePerMinute: throttlePerMinute || undefined,
        androidChannelId: androidChannelId || undefined,
        priority:
          priority === "custom"
            ? customPriority
            : priority === "high"
              ? "high"
              : "normal",
        ttl: ttl || undefined,
        collapseId: collapseId || undefined,
        iosBadgeType: iosBadgeType !== "None" ? iosBadgeType : undefined,
        iosBadgeCount:
          iosBadgeType !== "None" && iosBadgeCount ? iosBadgeCount : undefined,
        iosSound: iosSound || undefined,
        androidSound: androidSound || undefined,
        iosInterruptionLevel: iosInterruptionLevel || undefined,
        mutableContent,
        contentAvailable,
      };

      // attach templateId for live sends to update lastUsedAt on server
      if (!dryRun && appliedTemplateId) {
        payload.templateId = appliedTemplateId;
      }

      const result = await sendPushNotification(payload as any);

      if (dryRun) {
        setPreviewData(result);
        setShowPreview(true);
        showSuccessToast("Preview generated successfully");
      } else {
        showSuccessToast("Push notification sent successfully");
        // Reset form
        setTitle("");
        setMessage("");
        setUrl("");
        setImageUrl("");
        setConfirmLive(false);
        setAppliedTemplateId(null);
      }
    } catch (error) {
      showErrorToast(
        null,
        `Failed to ${dryRun ? "preview" : "send"} notification`
      );
    } finally {
      setSending(false);
    }
  };

  // Templates API helpers
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/push-notification/templates");
      const json = await res.json();
      setTemplates(json?.data?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const saveCurrentAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      showErrorToast(null, "Template name required");
      return;
    }
    const payload: any = {
      title: title.trim(),
      message: message.trim(),
      url: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      audience: segments,
      excludedSegments,
      includePlayerIds: includePlayerIds
        .split(/[\,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      includeExternalUserIds: includeExternalUserIds
        .split(/[\,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      data: safeParseJSON(dataJson),
      buttons: safeParseJSON(buttonsJson),
      androidChannelId: androidChannelId || undefined,
      priority:
        priority === "custom"
          ? customPriority
          : priority === "high"
            ? "high"
            : "normal",
      ttl: ttl || undefined,
      collapseId: collapseId || undefined,
      iosBadgeType: iosBadgeType !== "None" ? iosBadgeType : undefined,
      iosBadgeCount:
        iosBadgeType !== "None" && iosBadgeCount ? iosBadgeCount : undefined,
      iosSound: iosSound || undefined,
      androidSound: androidSound || undefined,
      iosInterruptionLevel: iosInterruptionLevel || undefined,
      mutableContent,
      contentAvailable,
      delayedOption,
      sendAfter: isScheduled ? scheduledTime : undefined,
      deliveryTimeOfDay:
        delayedOption === "timezone" ? deliveryTimeOfDay : undefined,
      throttlePerMinute: throttlePerMinute || undefined,
      filters: filters.length ? filters : undefined,
    };
    try {
      const res = await fetch("/api/admin/push-notification/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      showSuccessToast("Template saved");
      setNewTemplateName("");
      setNewTemplateDesc("");
      loadTemplates();
    } catch (e) {
      console.error(e);
      showErrorToast(null, "Failed to save template");
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/push-notification/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      loadTemplates();
    } catch (e) {
      console.error(e);
      showErrorToast(null, "Failed to delete template");
    }
  };

  const applyTemplate = (tpl: any) => {
    try {
      const p = tpl?.payload || {};
      setTitle(p.title || "");
      setMessage(p.message || "");
      setUrl(p.url || "");
      setImageUrl(p.imageUrl || "");
      setSegments(Array.isArray(p.audience) ? p.audience : segments);
      setExcludedSegments(
        Array.isArray(p.excludedSegments) ? p.excludedSegments : []
      );
      setIncludePlayerIds((p.includePlayerIds || []).join(", "));
      setIncludeExternalUserIds((p.includeExternalUserIds || []).join(", "));
      setDataJson(p.data ? JSON.stringify(p.data, null, 2) : "");
      setButtonsJson(p.buttons ? JSON.stringify(p.buttons, null, 2) : "");
      setAndroidChannelId(p.androidChannelId || "");
      if (typeof p.priority === "number") {
        setPriority("custom");
        setCustomPriority(p.priority);
      } else if (p.priority === "high") {
        setPriority("high");
      } else {
        setPriority("normal");
      }
      setTtl(p.ttl || 0);
      setCollapseId(p.collapseId || "");
      setIosBadgeType((p.iosBadgeType as any) || "None");
      setIosBadgeCount(p.iosBadgeCount || 0);
      setIosSound(p.iosSound || "");
      setAndroidSound(p.androidSound || "");
      setIosInterruptionLevel((p.iosInterruptionLevel as any) || "");
      setMutableContent(!!p.mutableContent);
      setContentAvailable(!!p.contentAvailable);
      setDelayedOption((p.delayedOption as any) || "immediate");
      setScheduledTime(p.sendAfter || "");
      setIsScheduled(!!p.sendAfter);
      setDeliveryTimeOfDay(p.deliveryTimeOfDay || "");
      setThrottlePerMinute(p.throttlePerMinute || 0);
      setFilters(Array.isArray(p.filters) ? p.filters : []);
      setAppliedTemplateId(tpl?.id || null);
      showSuccessToast("Template applied");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleTestSend = async () => {
    if (!testPlayerId.trim() || !title.trim() || !message.trim()) {
      showErrorToast(
        null,
        "Player ID, title, and message are required for test"
      );
      return;
    }

    setTestSending(true);
    try {
      const res = await fetch("/api/admin/push-notification/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: testPlayerId.trim(),
          title: title.trim(),
          message: message.trim(),
          url: url.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Test send failed");

      showSuccessToast("Test notification sent successfully");
    } catch (error) {
      showErrorToast(null, "Failed to send test notification");
    } finally {
      setTestSending(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast("Copied to clipboard");
    } catch (error) {
      showErrorToast(null, "Failed to copy to clipboard");
    }
  };

  const templateCategories = useMemo(() => {
    return {
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
          message:
            "Complete a few more details to boost your visibility by 3x.",
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
          message:
            "Filter by location, interests, and more to find better matches.",
        },
        {
          name: "Chat improvements",
          title: "A better chat experience 💬",
          message:
            "Voice messages, reactions, and more! Jump in and say hello!",
        },
      ],
      Promotion: [
        {
          name: "Limited-time offer",
          title: "Limited-time offer! 🎉",
          message:
            "Upgrade to Premium today and save 30% - only 24 hours left!",
          imageUrl: "/images/notifications/promotion.png",
        },
        {
          name: "Weekend sale",
          title: "Weekend sale: Premium perks 🛍️",
          message:
            "Unlock unlimited likes and Super Likes at 50% off this weekend.",
        },
        {
          name: "Referral",
          title: "Invite friends, get rewards 🎁",
          message:
            "Share Aroosi and get 1 month Premium free for each friend who joins.",
        },
      ],
      Onboarding: [
        {
          name: "Welcome",
          title: "Welcome to Aroosi! 🌟",
          message:
            "Set your preferences to get the best matches tailored for you.",
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
          message:
            "Aroosi will be briefly unavailable tonight at 2:00 AM UTC for improvements.",
        },
        {
          name: "Service restored",
          title: "We&apos;re back online! ✅",
          message:
            "Thanks for your patience. All services are now restored and running smoothly.",
        },
        {
          name: "New features",
          title: "What&apos;s new this week 📱",
          message: "Check out the latest features and improvements in the app!",
        },
      ],
      Seasonal: [
        {
          name: "Holiday greetings",
          title: "Happy holidays from Aroosi! 🎄",
          message:
            "Wishing you joyful connections and love this holiday season!",
          imageUrl: "/images/notifications/holidays.png",
        },
        {
          name: "New Year",
          title: "New year, new connections! 🎊",
          message: "Start 2025 by meeting someone special on Aroosi.",
        },
        {
          name: "Valentine&apos;s Day",
          title: "Love is in the air! 💘",
          message:
            "Find your Valentine on Aroosi - special Premium offers inside!",
          imageUrl: "/images/notifications/valentines.png",
        },
      ],
    } as Record<
      string,
      { name: string; title: string; message: string; imageUrl?: string }[]
    >;
  }, []);

  const categoryNames = useMemo(
    () => Object.keys(templateCategories),
    [templateCategories]
  );

  const presets = useMemo(
    () => templateCategories[selectedCategory] || [],
    [templateCategories, selectedCategory]
  );

  const totalDevicePages = useMemo(
    () => Math.max(1, Math.ceil(deviceTotal / devicePageSize)),
    [deviceTotal]
  );

  // Confirmation modal for 'Send to selected users'
  const [confirmSendUsersOpen, setConfirmSendUsersOpen] = useState(false);
  const [pendingExternalIds, setPendingExternalIds] = useState<string[]>([]);
  // Confirmation modal for 'Send to selected devices'
  const [confirmSendDevicesOpen, setConfirmSendDevicesOpen] = useState(false);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);

  const NotificationPreview = () => (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-600">
          Notification Preview
        </span>
      </div>

      {/* Mobile notification mockup */}
      <div className="bg-white rounded-lg shadow-md p-3 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-900">Aroosi</span>
              <span className="text-xs text-gray-500">now</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 leading-tight mb-1">
              {title || "Your notification title"}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {message || "Your notification message will appear here"}
            </p>
            {imageUrl && (
              <div className="mt-2 rounded bg-gray-100 h-16 flex items-center justify-center text-xs text-gray-500">
                🖼️ Image: {imageUrl.split("/").pop()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 space-y-2 text-xs text-gray-600">
        <div>
          <strong>Audience:</strong> {segments.join(", ")} (max{" "}
          {maxAudience.toLocaleString()})
        </div>
        {url && (
          <div>
            <strong>Action URL:</strong> {url}
          </div>
        )}
        {isScheduled && scheduledTime && (
          <div>
            <strong>Scheduled:</strong>{" "}
            {new Date(scheduledTime).toLocaleString()}
          </div>
        )}
        <div>
          <strong>Mode:</strong> {dryRun ? "Preview only" : "Live send"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Push Notifications
          </h1>
          <p className="text-gray-600">
            Manage and send push notifications to users
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Bell className="h-3 w-3" />
          OneSignal
        </Badge>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold">
                  {analytics.totalDevices.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Devices</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.activeDevices.toLocaleString()}
                </p>
              </div>
              <Smartphone className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Platform Distribution</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>iOS</span>
                  <span>{analytics.iosDevices}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Android</span>
                  <span>{analytics.androidDevices}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Web</span>
                  <span>{analytics.webDevices}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Sends</p>
                <p className="text-2xl font-bold">
                  {analytics.recentNotifications}
                </p>
              </div>
              <Send className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose" className="gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <TestTube className="h-4 w-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Copy className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Compose Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Safety Notice */}
                <div className="rounded-md bg-blue-50 text-blue-800 text-sm p-3 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Safety Mode</span>
                  </div>
                  <p className="mt-1">
                    Use Dry Run to preview the payload and audience without
                    sending.
                  </p>
                </div>

                {/* Template Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-2">
                    <Label
                      htmlFor="template-category"
                      className="text-sm font-medium"
                    >
                      Template Category
                    </Label>
                    <select
                      id="template-category"
                      className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categoryNames.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">
                      Quick Templates
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {presets.map((p) => (
                        <Button
                          key={p.name}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTitle(p.title);
                            setMessage(p.message);
                            if (p.imageUrl) setImageUrl(p.imageUrl);
                            setAppliedTemplateId(null);
                          }}
                          title={`Apply ${p.name} preset`}
                        >
                          {p.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notification Content */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="push-title" className="text-sm font-medium">
                      Title *
                    </Label>
                    <Input
                      id="push-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Notification title"
                      maxLength={65}
                    />
                    <div className="text-xs text-gray-500">
                      {title.length}/65 characters
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="push-message"
                      className="text-sm font-medium"
                    >
                      Message *
                    </Label>
                    <Textarea
                      id="push-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Notification message"
                      maxLength={240}
                    />
                    <div className="text-xs text-gray-500">
                      {message.length}/240 characters
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="push-url" className="text-sm font-medium">
                      Action URL
                    </Label>
                    <Input
                      id="push-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://aroosi.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="push-image" className="text-sm font-medium">
                      Image URL
                    </Label>
                    <Input
                      id="push-image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://aroosi.com/images/..."
                    />
                  </div>

                  {/* Custom Data */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Custom Data (JSON)
                    </Label>
                    <Textarea
                      value={dataJson}
                      onChange={(e) => setDataJson(e.target.value)}
                      rows={4}
                      placeholder='{"type":"new_message","conversationId":"..."}'
                    />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Buttons (JSON)
                    </Label>
                    <Textarea
                      value={buttonsJson}
                      onChange={(e) => setButtonsJson(e.target.value)}
                      rows={3}
                      placeholder='[{"id":"view","text":"View"}]'
                    />
                    <div className="text-xs text-gray-500">
                      Supported keys: id, text, icon, url
                    </div>
                  </div>
                </div>

                {/* Audience & Scheduling */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Audience Segments
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Subscribed Users",
                        "Active Users",
                        "Engaged Last 30d",
                      ].map((seg) => {
                        const active = segments.includes(seg);
                        return (
                          <Button
                            key={seg}
                            variant={active ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setSegments((prev) =>
                                prev.includes(seg)
                                  ? prev.filter((s) => s !== seg)
                                  : [...prev, seg]
                              )
                            }
                          >
                            {seg}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm font-medium">
                        Exclude Segments
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {["Dormant", "Churn Risk"].map((seg) => {
                          const active = excludedSegments.includes(seg);
                          return (
                            <Button
                              key={seg}
                              variant={active ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setExcludedSegments((prev) =>
                                  prev.includes(seg)
                                    ? prev.filter((s) => s !== seg)
                                    : [...prev, seg]
                                )
                              }
                            >
                              {seg}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Max Audience</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100000}
                      value={maxAudience}
                      onChange={(e) =>
                        setMaxAudience(Number(e.target.value) || 1)
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Provider-side segmentation applies; this is informational
                      only.
                    </p>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="scheduled"
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                    <Label
                      htmlFor="scheduled"
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Schedule for later
                    </Label>
                  </div>

                  {isScheduled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Delivery Mode</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                          value={delayedOption}
                          onChange={(e) =>
                            setDelayedOption(e.target.value as any)
                          }
                        >
                          <option value="immediate">
                            Immediate (send_after)
                          </option>
                          <option value="timezone">Per timezone</option>
                          <option value="last-active">
                            Optimized by last active
                          </option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Send After</Label>
                        <Input
                          type="datetime-local"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                      {delayedOption === "timezone" && (
                        <div>
                          <Label className="text-sm">
                            Delivery Time (HH:MM)
                          </Label>
                          <Input
                            placeholder="09:00:00"
                            value={deliveryTimeOfDay}
                            onChange={(e) =>
                              setDeliveryTimeOfDay(e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Filters Builder */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Filters (advanced targeting)
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFilters((prev) => [
                          ...prev,
                          {
                            field: "tag",
                            key: "",
                            relation: "=",
                            value: "",
                          } as any,
                        ])
                      }
                    >
                      Add Filter
                    </Button>
                  </div>
                  {filters.length === 0 && (
                    <div className="text-xs text-gray-500">
                      No filters. Add a filter to target by tag, language,
                      country, last_session, session_count, or amount_spent. You
                      can also insert an OR operator between filters.
                    </div>
                  )}
                  <div className="space-y-2">
                    {filters.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2"
                      >
                        {"operator" in f ? (
                          <>
                            <Badge variant="outline">OR</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setFilters(filters.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={(f as any).field}
                              onChange={(e) => {
                                const nf: any = { ...f } as any;
                                const val = e.target.value as any;
                                if (val === "tag") {
                                  nf.field = "tag";
                                  nf.key = "";
                                  nf.relation = "=";
                                  nf.value = "";
                                } else if (
                                  val === "language" ||
                                  val === "country"
                                ) {
                                  nf.field = val;
                                  nf.relation = "=";
                                  nf.value = "";
                                } else if (val === "last_session") {
                                  nf.field = "last_session";
                                  nf.relation = ">";
                                  nf.hours_ago = 24;
                                } else if (
                                  val === "session_count" ||
                                  val === "amount_spent"
                                ) {
                                  nf.field = val;
                                  nf.relation = ">";
                                  nf.value = 0;
                                }
                                const copy = [...filters];
                                copy[idx] = nf;
                                setFilters(copy);
                              }}
                            >
                              <option value="tag">tag</option>
                              <option value="language">language</option>
                              <option value="country">country</option>
                              <option value="last_session">last_session</option>
                              <option value="session_count">
                                session_count
                              </option>
                              <option value="amount_spent">amount_spent</option>
                            </select>
                            {(f as any).field === "tag" && (
                              <>
                                <Input
                                  className="w-40"
                                  placeholder="key"
                                  value={(f as any).key}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).key = e.target.value;
                                    setFilters(copy as any);
                                  }}
                                />
                                <select
                                  className="border rounded px-2 py-1 text-sm"
                                  value={(f as any).relation}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).relation =
                                      e.target.value;
                                    setFilters(copy as any);
                                  }}
                                >
                                  <option value="=">=</option>
                                  <option value="!=">!=</option>
                                  <option value=">">&gt;</option>
                                  <option value="<">&lt;</option>
                                  <option value="exists">exists</option>
                                  <option value="not_exists">not_exists</option>
                                </select>
                                {(f as any).relation !== "exists" &&
                                  (f as any).relation !== "not_exists" && (
                                    <Input
                                      className="w-48"
                                      placeholder="value"
                                      value={(f as any).value || ""}
                                      onChange={(e) => {
                                        const copy: any[] = [...filters];
                                        (copy[idx] as any).value =
                                          e.target.value;
                                        setFilters(copy as any);
                                      }}
                                    />
                                  )}
                              </>
                            )}
                            {((f as any).field === "language" ||
                              (f as any).field === "country") && (
                              <>
                                <select
                                  className="border rounded px-2 py-1 text-sm"
                                  value={(f as any).relation}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).relation =
                                      e.target.value;
                                    setFilters(copy as any);
                                  }}
                                >
                                  <option value="=">=</option>
                                  <option value="!=">!=</option>
                                </select>
                                <Input
                                  className="w-40"
                                  placeholder={
                                    (f as any).field === "language"
                                      ? "e.g., en"
                                      : "e.g., US"
                                  }
                                  value={(f as any).value || ""}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).value = e.target.value;
                                    setFilters(copy as any);
                                  }}
                                />
                              </>
                            )}
                            {(f as any).field === "last_session" && (
                              <>
                                <select
                                  className="border rounded px-2 py-1 text-sm"
                                  value={(f as any).relation}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).relation =
                                      e.target.value;
                                    setFilters(copy as any);
                                  }}
                                >
                                  <option value=">">&gt;</option>
                                  <option value="<">&lt;</option>
                                </select>
                                <Input
                                  type="number"
                                  className="w-32"
                                  placeholder="hours_ago"
                                  value={(f as any).hours_ago || 24}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).hours_ago =
                                      Number(e.target.value) || 0;
                                    setFilters(copy as any);
                                  }}
                                />
                              </>
                            )}
                            {((f as any).field === "session_count" ||
                              (f as any).field === "amount_spent") && (
                              <>
                                <select
                                  className="border rounded px-2 py-1 text-sm"
                                  value={(f as any).relation}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).relation =
                                      e.target.value;
                                    setFilters(copy as any);
                                  }}
                                >
                                  <option value="=">=</option>
                                  <option value="!=">!=</option>
                                  <option value=">">&gt;</option>
                                  <option value="<">&lt;</option>
                                </select>
                                <Input
                                  type="number"
                                  className="w-32"
                                  placeholder="value"
                                  value={(f as any).value ?? 0}
                                  onChange={(e) => {
                                    const copy: any[] = [...filters];
                                    (copy[idx] as any).value =
                                      Number(e.target.value) || 0;
                                    setFilters(copy as any);
                                  }}
                                />
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setFilters(filters.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFilters((prev) => [...prev, { operator: "OR" }])
                        }
                      >
                        Insert OR operator
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Send Options */}
                <div className="space-y-3 border-t pt-4">
                  {/* Targeting IDs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Include Player IDs</Label>
                      <Input
                        placeholder="id1, id2, id3"
                        value={includePlayerIds}
                        onChange={(e) => setIncludePlayerIds(e.target.value)}
                      />
                      <div className="text-xs text-gray-500">
                        Optional: overrides segment targeting for direct sends
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">
                        Include External User IDs
                      </Label>
                      <Input
                        placeholder="user1, user2"
                        value={includeExternalUserIds}
                        onChange={(e) =>
                          setIncludeExternalUserIds(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Delivery Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Android Channel ID</Label>
                      <Input
                        value={androidChannelId}
                        onChange={(e) => setAndroidChannelId(e.target.value)}
                        placeholder="(optional)"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Priority</Label>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="custom">Custom</option>
                        </select>
                        {priority === "custom" && (
                          <Input
                            type="number"
                            className="w-24"
                            value={customPriority}
                            onChange={(e) =>
                              setCustomPriority(Number(e.target.value) || 0)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Time To Live (seconds)</Label>
                      <Input
                        type="number"
                        value={ttl}
                        onChange={(e) => setTtl(Number(e.target.value) || 0)}
                        placeholder="0 = default"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Collapse ID</Label>
                      <Input
                        value={collapseId}
                        onChange={(e) => setCollapseId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Throttle per minute</Label>
                      <Input
                        type="number"
                        value={throttlePerMinute}
                        onChange={(e) =>
                          setThrottlePerMinute(Number(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">iOS Badge</Label>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={iosBadgeType}
                          onChange={(e) =>
                            setIosBadgeType(e.target.value as any)
                          }
                        >
                          <option>None</option>
                          <option>SetTo</option>
                          <option>Increase</option>
                        </select>
                        {iosBadgeType !== "None" && (
                          <Input
                            type="number"
                            className="w-24"
                            value={iosBadgeCount}
                            onChange={(e) =>
                              setIosBadgeCount(Number(e.target.value) || 0)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">iOS Sound</Label>
                      <Input
                        value={iosSound}
                        onChange={(e) => setIosSound(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Android Sound</Label>
                      <Input
                        value={androidSound}
                        onChange={(e) => setAndroidSound(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">iOS Interruption Level</Label>
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={iosInterruptionLevel}
                        onChange={(e) =>
                          setIosInterruptionLevel(e.target.value as any)
                        }
                      >
                        <option value="">Default</option>
                        <option value="active">active</option>
                        <option value="passive">passive</option>
                        <option value="time-sensitive">time-sensitive</option>
                        <option value="critical">critical</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="mutableContent"
                          checked={mutableContent}
                          onCheckedChange={setMutableContent}
                        />
                        <Label htmlFor="mutableContent">Mutable Content</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="contentAvailable"
                          checked={contentAvailable}
                          onCheckedChange={setContentAvailable}
                        />
                        <Label htmlFor="contentAvailable">
                          Content Available
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="dryRun"
                      checked={dryRun}
                      onCheckedChange={setDryRun}
                    />
                    <Label htmlFor="dryRun" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Dry run (preview only)
                    </Label>
                  </div>

                  {!dryRun && (
                    <div className="flex items-center gap-3">
                      <Switch
                        id="confirmLive"
                        checked={confirmLive}
                        onCheckedChange={setConfirmLive}
                      />
                      <Label htmlFor="confirmLive" className="text-red-600">
                        I confirm this live send to selected segments
                      </Label>
                    </div>
                  )}

                  {!dryRun && !confirmLive && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                      Confirmation is required for live sends. Toggle the
                      confirmation switch above.
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    !title.trim() ||
                    !message.trim() ||
                    (!dryRun && !confirmLive)
                  }
                  className="w-full"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {dryRun ? "Previewing..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      {dryRun ? (
                        <Eye className="h-4 w-4 mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {dryRun ? "Preview Notification" : "Send Notification"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationPreview />

                {previewData && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Payload Preview</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(previewData, null, 2))
                        }
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Device Management
                </CardTitle>
                <Badge variant="outline">
                  {deviceTotal.toLocaleString()} devices
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Search by email, player ID, or device type"
                  className="max-w-md"
                />
                <Button
                  onClick={() => {
                    setDevicePage(1);
                    fetchDevices();
                  }}
                  disabled={devicesLoading}
                >
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchDevices()}
                  disabled={devicesLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    const ids = Array.from(selectedDevices);
                    if (!ids.length) return;
                    setPendingPlayerIds(ids);
                    setConfirmSendDevicesOpen(true);
                  }}
                  disabled={selectedDevices.size === 0}
                  title="Prefill Include Player IDs and go to Compose"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send to selected devices
                </Button>
                <Button
                  onClick={() => {
                    if (selectedDevices.size === 0) return;
                    const selected = new Set(selectedDevices);
                    const userIds = Array.from(
                      new Set(
                        devices
                          .filter((d) => selected.has(d.playerId))
                          .map((d) => d.userId)
                          .filter(Boolean)
                      )
                    );
                    if (userIds.length === 0) return;
                    setPendingExternalIds(userIds);
                    setConfirmSendUsersOpen(true);
                  }}
                  disabled={selectedDevices.size === 0}
                  title="Prefill Include External User IDs and go to Compose"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Send to selected users
                </Button>
              </div>

              {/* Device Table */}
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevices(
                                new Set(devices.map((d) => d.playerId))
                              );
                            } else {
                              setSelectedDevices(new Set());
                            }
                          }}
                          checked={
                            selectedDevices.size === devices.length &&
                            devices.length > 0
                          }
                        />
                      </th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Player ID</th>
                      <th className="text-left p-3">Device</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Registered</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                        key={device.playerId}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedDevices.has(device.playerId)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedDevices);
                              if (e.target.checked) {
                                newSelected.add(device.playerId);
                              } else {
                                newSelected.delete(device.playerId);
                              }
                              setSelectedDevices(newSelected);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          {device.email ? (
                            <button
                              type="button"
                              className="underline underline-offset-2 text-pink-600 hover:text-pink-700"
                              onClick={() => {
                                setDeviceSearch(device.email!);
                                setDevicePage(1);
                                fetchDevices({
                                  search: device.email!,
                                  page: 1,
                                });
                              }}
                              title={`Filter by ${device.email}`}
                            >
                              {device.email}
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {device.playerId.slice(0, 8)}...
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(device.playerId)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize">
                            {device.deviceType}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {device.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          {device.registeredAt
                            ? new Date(device.registeredAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTestPlayerId(device.playerId)}
                              title="Use for test notification"
                            >
                              <TestTube className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {devices.length === 0 && (
                      <tr>
                        <td
                          className="p-8 text-center text-gray-500"
                          colSpan={7}
                        >
                          {devicesLoading
                            ? "Loading devices..."
                            : "No devices found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {devices.length} of {deviceTotal.toLocaleString()}{" "}
                  devices
                  {selectedDevices.size > 0 && (
                    <span className="ml-4 text-pink-600">
                      {selectedDevices.size} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDevicePage((p) => Math.max(1, p - 1))}
                    disabled={devicePage <= 1 || devicesLoading}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {devicePage} of {totalDevicePages}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDevicePage((p) => Math.min(totalDevicePages, p + 1))
                    }
                    disabled={devicePage >= totalDevicePages || devicesLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-amber-50 text-amber-800 text-sm p-3 border border-amber-200">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  <span className="font-medium">Test Mode</span>
                </div>
                <p className="mt-1">
                  Send a test notification to a specific device using its Player
                  ID. Use the form above to compose your message, then specify
                  the target device here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-player-id" className="text-sm font-medium">
                  Player ID *
                </Label>
                <Input
                  id="test-player-id"
                  value={testPlayerId}
                  onChange={(e) => setTestPlayerId(e.target.value)}
                  placeholder="Enter player ID from devices list above"
                />
                <div className="text-xs text-gray-500">
                  You can copy a Player ID from the Devices tab above
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">
                  Test Notification Preview
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Title:</strong> {title || "(Enter title above)"}
                  </div>
                  <div>
                    <strong>Message:</strong>{" "}
                    {message || "(Enter message above)"}
                  </div>
                  {url && (
                    <div>
                      <strong>URL:</strong> {url}
                    </div>
                  )}
                  <div>
                    <strong>Target:</strong>{" "}
                    {testPlayerId || "(Select player ID)"}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleTestSend}
                disabled={
                  testSending ||
                  !testPlayerId.trim() ||
                  !title.trim() ||
                  !message.trim()
                }
                className="w-full"
                size="lg"
                variant="outline"
              >
                {testSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Send Test Notification
                  </>
                )}
              </Button>

              {/* Test Guidelines */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-sm text-blue-900 mb-2">
                  Testing Guidelines
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Test notifications are sent immediately to the specified
                    device
                  </li>
                  <li>
                    • Make sure the target device has the app installed and
                    notifications enabled
                  </li>
                  <li>
                    • Test notifications don&apos;t count towards your audience
                    limits
                  </li>
                  <li>
                    • Use this to verify message content, timing, and appearance
                    before mass sends
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  Saved Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {templatesLoading
                      ? "Loading..."
                      : `${templates.length} templates`}
                  </div>
                  <Button variant="outline" size="sm" onClick={loadTemplates}>
                    Refresh
                  </Button>
                </div>
                <div className="border rounded-md divide-y">
                  {templates.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">
                      No templates saved yet.
                    </div>
                  )}
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-gray-500">
                            {t.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Created {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => applyTemplate(t)}>
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplate(t.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Save Current as Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Template Name</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Reengage 30d"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Description (optional)</Label>
                  <Input
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Short note about this template"
                  />
                </div>
                <Button
                  onClick={saveCurrentAsTemplate}
                  disabled={!newTemplateName.trim()}
                  className="w-full"
                >
                  Save Template
                </Button>
                <div className="text-xs text-gray-500">
                  The template captures all current fields, including advanced
                  options and filters.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      {/* Confirm Send to Selected Users Dialog */}
      <ConfirmSendUsersDialog
        open={confirmSendUsersOpen}
        count={pendingExternalIds.length}
        onCancel={() => {
          setConfirmSendUsersOpen(false);
          setPendingExternalIds([]);
        }}
        onConfirm={() => {
          setIncludeExternalUserIds(pendingExternalIds.join(", "));
          setConfirmSendUsersOpen(false);
          setPendingExternalIds([]);
          showSuccessToast("Selected users added to Include External User IDs");
          setActiveTab("compose");
        }}
      />
      {/* Confirm Send to Selected Devices Dialog */}
      <ConfirmSendDevicesDialog
        open={confirmSendDevicesOpen}
        count={pendingPlayerIds.length}
        onCancel={() => {
          setConfirmSendDevicesOpen(false);
          setPendingPlayerIds([]);
        }}
        onConfirm={() => {
          setIncludePlayerIds(pendingPlayerIds.join(", "));
          setConfirmSendDevicesOpen(false);
          setPendingPlayerIds([]);
          showSuccessToast("Selected device IDs added to Include Player IDs");
          setActiveTab("compose");
        }}
      />
    </div>
  );
}

// Local inline dialog component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmSendUsersDialog({
  open,
  count,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to selected users?</DialogTitle>
          <DialogDescription>
            This will prefill <strong>Include External User IDs</strong> with{" "}
            {count} user IDs from the Devices tab and take you to Compose.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmSendDevicesDialog({
  open,
  count,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to selected devices?</DialogTitle>
          <DialogDescription>
            This will prefill <strong>Include Player IDs</strong> with {count}{" "}
            device IDs from the Devices tab and take you to Compose.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
