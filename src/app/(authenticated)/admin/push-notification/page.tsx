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

  // Notification form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [segments, setSegments] = useState<string[]>(["Subscribed Users"]);
  const [maxAudience, setMaxAudience] = useState<number>(100000);
  const [confirmLive, setConfirmLive] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Re-engagement");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);

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
      const payload = {
        title: title.trim(),
        message: message.trim(),
        url: url.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        dryRun,
        confirm: !dryRun && confirmLive,
        audience: segments,
        maxAudience,
        scheduledTime: isScheduled ? scheduledTime : undefined,
      };

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

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
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
                    <Input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  )}
                </div>

                {/* Send Options */}
                <div className="space-y-3 border-t pt-4">
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
      </Tabs>
    </div>
  );
}
