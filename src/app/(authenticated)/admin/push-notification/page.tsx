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
  Trash2,
  Copy,
  AlertTriangle,
  RefreshCw,
  Save,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  AnalyticsDashboard,
  NotificationForm,
  NotificationPreview,
  DeviceManager,
  TestNotification,
  TemplateManager,
  ConfirmSendUsersDialog,
  ConfirmSendDevicesDialog,
} from "./components";

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
  const [testTitle, setTestTitle] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<any>(null);

  // Template management state
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [templateImageUrl, setTemplateImageUrl] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");

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
    } catch (_e) {
      console.error(_e);
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
    } catch (_error) {
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
    } catch (_e) {
      console.error(_e);
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
    } catch (_e) {
      console.error(_e);
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
    } catch (_e) {
      console.error(_e);
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
    } catch (_error) {
      showErrorToast(null, "Failed to copy to clipboard");
    }
  };

  const handleSaveTemplate = async () => {
    if (
      !templateName.trim() ||
      !templateTitle.trim() ||
      !templateMessage.trim()
    ) {
      showErrorToast(null, "Template name, title, and message are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/push-notification/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          title: templateTitle,
          message: templateMessage,
          imageUrl: templateImageUrl,
          url: templateUrl,
          category: templateCategory || "General",
        }),
      });

      if (!res.ok) throw new Error("Failed to save template");
      showSuccessToast("Template saved successfully");
      setTemplateName("");
      setTemplateTitle("");
      setTemplateMessage("");
      setTemplateImageUrl("");
      setTemplateUrl("");
      setTemplateCategory("");
      loadTemplates();
    } catch (error) {
      showErrorToast(null, "Failed to save template");
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(
        `/api/admin/push-notification/templates/${template.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Failed to delete template");
      showSuccessToast("Template deleted successfully");
      loadTemplates();
    } catch (error) {
      showErrorToast(null, "Failed to delete template");
    }
  };

  const handleApplyTemplate = (template: any) => {
    setTitle(template.title);
    setMessage(template.message);
    setImageUrl(template.imageUrl || "");
    setUrl(template.url || "");
    setSelectedCategory(template.category || "Re-engagement");
    showSuccessToast("Template applied successfully");
  };

  // Add missing dialog states
  const [confirmSendUsersOpen, setConfirmSendUsersOpen] = useState(false);
  const [confirmSendDevicesOpen, setConfirmSendDevicesOpen] = useState(false);
  const [pendingExternalIds, setPendingExternalIds] = useState<string[]>([]);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500 rounded-xl">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Push Notifications
                </h1>
                <p className="text-slate-600">
                  Manage and send push notifications to users
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <Bell className="h-3 w-3" />
              OneSignal
            </Badge>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Service Active
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard analytics={analytics} />

        {/* Main Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <div className="border-b border-slate-200 bg-slate-50/50">
              <TabsList className="grid w-full grid-cols-4 bg-transparent h-14 p-1">
                <TabsTrigger
                  value="compose"
                  className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Compose</span>
                </TabsTrigger>
                <TabsTrigger
                  value="devices"
                  className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all"
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Devices</span>
                </TabsTrigger>
                <TabsTrigger
                  value="test"
                  className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all"
                >
                  <TestTube className="h-4 w-4" />
                  <span className="hidden sm:inline">Test</span>
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Templates</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Compose Tab */}
            <TabsContent value="compose" className="p-6">
              <NotificationForm
                title={title}
                setTitle={setTitle}
                message={message}
                setMessage={setMessage}
                url={url}
                setUrl={setUrl}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                dataJson={dataJson}
                setDataJson={setDataJson}
                buttonsJson={buttonsJson}
                setButtonsJson={setButtonsJson}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categoryNames={categoryNames}
                presets={presets}
                setAppliedTemplateId={setAppliedTemplateId}
                segments={segments}
                setSegments={setSegments}
                excludedSegments={excludedSegments}
                setExcludedSegments={setExcludedSegments}
                maxAudience={maxAudience}
                setMaxAudience={setMaxAudience}
                dryRun={dryRun}
                setDryRun={setDryRun}
                confirmLive={confirmLive}
                setConfirmLive={setConfirmLive}
                handleSend={handleSend}
                sending={sending}
                previewData={previewData}
                copyToClipboard={copyToClipboard}
              />
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="p-6">
              <DeviceManager
                devices={devices}
                deviceSearch={deviceSearch}
                setDeviceSearch={setDeviceSearch}
                devicePage={devicePage}
                setDevicePage={setDevicePage}
                deviceTotal={deviceTotal}
                devicesLoading={devicesLoading}
                selectedDevices={selectedDevices}
                setSelectedDevices={setSelectedDevices}
                setTestPlayerId={setTestPlayerId}
                setPendingExternalIds={setPendingExternalIds}
                setPendingPlayerIds={setPendingPlayerIds}
                setConfirmSendUsersOpen={setConfirmSendUsersOpen}
                setConfirmSendDevicesOpen={setConfirmSendDevicesOpen}
                setActiveTab={setActiveTab}
                copyToClipboard={copyToClipboard}
                fetchDevices={fetchDevices}
                totalDevicePages={Math.ceil(deviceTotal / 50)}
              />
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test" className="p-6">
              <TestNotification
                testTitle={testTitle}
                setTestTitle={setTestTitle}
                testMessage={testMessage}
                setTestMessage={setTestMessage}
                testUrl={testUrl}
                setTestUrl={setTestUrl}
                testImageUrl={testImageUrl}
                setTestImageUrl={setTestImageUrl}
                testPlayerId={testPlayerId}
                setTestPlayerId={setTestPlayerId}
                handleTestSend={handleTestSend}
                testSending={testSending}
                testResult={testResult}
                copyToClipboard={copyToClipboard}
              />
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="p-6">
              <TemplateManager
                templates={templates}
                templateSearch={templateSearch}
                setTemplateSearch={setTemplateSearch}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                templateName={templateName}
                setTemplateName={setTemplateName}
                templateTitle={templateTitle}
                setTemplateTitle={setTemplateTitle}
                templateMessage={templateMessage}
                setTemplateMessage={setTemplateMessage}
                templateImageUrl={templateImageUrl}
                setTemplateImageUrl={setTemplateImageUrl}
                templateUrl={templateUrl}
                setTemplateUrl={setTemplateUrl}
                templateCategory={templateCategory}
                setTemplateCategory={setTemplateCategory}
                handleSaveTemplate={handleSaveTemplate}
                handleDeleteTemplate={handleDeleteTemplate}
                handleApplyTemplate={handleApplyTemplate}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirm Send to Selected Users Dialog */}
        <ConfirmSendUsersDialog
          open={confirmSendUsersOpen}
          onOpenChange={setConfirmSendUsersOpen}
          onCancel={() => {
            setConfirmSendUsersOpen(false);
            setPendingExternalIds([]);
          }}
          onConfirm={() => {
            setIncludeExternalUserIds(pendingExternalIds.join(", "));
            setConfirmSendUsersOpen(false);
            setPendingExternalIds([]);
            showSuccessToast(
              "Selected users added to Include External User IDs"
            );
            setActiveTab("compose");
          }}
          userIds={devices
            .filter((d) => pendingExternalIds.includes(d.userId))
            .map((d) => d.userId)}
          pendingExternalIds={pendingExternalIds}
        />

        {/* Confirm Send to Selected Devices Dialog */}
        <ConfirmSendDevicesDialog
          open={confirmSendDevicesOpen}
          onOpenChange={setConfirmSendDevicesOpen}
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
          playerIds={devices
            .filter((d) => pendingPlayerIds.includes(d.playerId))
            .map((d) => d.playerId)}
          pendingPlayerIds={pendingPlayerIds}
        />
      </div>
    </div>
  );
}