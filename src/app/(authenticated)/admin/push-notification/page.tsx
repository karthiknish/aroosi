"use client";

import { useMemo, useState } from "react";
import { sendPushNotification } from "@/lib/pushNotificationApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PushNotificationAdminPage() {
  // Cookie-auth; no token in context
  useAuthContext();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [segments, setSegments] = useState<string[]>(["Subscribed Users"]);
  const [maxAudience, setMaxAudience] = useState<number>(100000);
  const [confirmLive, setConfirmLive] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Re-engagement");

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if (!dryRun && !confirmLive) return; // guard live send without confirm
    setSending(true);
    try {
      // Server reads HttpOnly cookies for admin authorization
      await sendPushNotification({
        title: title.trim(),
        message: message.trim(),
        url: url.trim() || undefined,
        dryRun,
        confirm: !dryRun && confirmLive,
        audience: segments,
        maxAudience,
      } as any);
    } finally {
      setSending(false);
    }
  };

  const templateCategories = useMemo(() => {
    return {
      "Re-engagement": [
        {
          name: "We miss you",
          title: "We miss you at Aroosi",
          message: "Come back and discover new matches waiting for you!",
        },
        {
          name: "New matches",
          title: "New matches just landed",
          message: "Fresh profiles match your preferences. Check them out now!",
        },
        {
          name: "Unfinished profile",
          title: "Finish your profile to get noticed",
          message: "Complete a few more details to boost your visibility.",
        },
      ],
      "Feature launch": [
        {
          name: "Spotlight",
          title: "Shine with Spotlight",
          message: "Try the new Spotlight badge and get more profile views.",
        },
        {
          name: "Advanced search",
          title: "Advanced Search is here",
          message: "Filter by more preferences to find better matches.",
        },
        {
          name: "Chat improvements",
          title: "A better chat experience",
          message: "We’ve improved messaging. Jump in and say hello!",
        },
      ],
      Promotion: [
        {
          name: "Limited-time offer",
          title: "Limited-time offer!",
          message: "Upgrade to Premium today and save 30%",
        },
        {
          name: "Weekend sale",
          title: "Weekend sale: Premium perks",
          message: "Unlock unlimited likes and more at a special price.",
        },
        {
          name: "Referral",
          title: "Invite friends, get rewards",
          message: "Share Aroosi and get exclusive benefits for each referral.",
        },
      ],
      Onboarding: [
        {
          name: "Welcome",
          title: "Welcome to Aroosi",
          message: "Set your preferences to get the best matches.",
        },
        {
          name: "Upload photos",
          title: "Add your best photo",
          message: "Profiles with photos get more likes and messages.",
        },
        {
          name: "Set interests",
          title: "Tell us what you like",
          message: "Add interests so we can recommend better matches.",
        },
      ],
      "Downtime notice": [
        {
          name: "Planned maintenance",
          title: "Scheduled maintenance",
          message: "Aroosi will be briefly unavailable at 2:00 AM UTC tonight.",
        },
        {
          name: "Service restored",
          title: "We’re back online",
          message: "Thanks for your patience. All services are now restored.",
        },
        {
          name: "Incident update",
          title: "Service update",
          message: "We’re investigating an issue affecting some users.",
        },
      ],
      Seasonal: [
        {
          name: "Holiday greetings",
          title: "Happy holidays from Aroosi",
          message: "Wishing you joyful connections this season!",
        },
        {
          name: "New Year",
          title: "New year, new connections",
          message: "Start the year by meeting someone special on Aroosi.",
        },
      ],
    } as Record<string, { name: string; title: string; message: string }[]>;
  }, []);

  const categoryNames = useMemo(
    () => Object.keys(templateCategories),
    [templateCategories]
  );
  const presets = useMemo(
    () => templateCategories[selectedCategory] || [],
    [templateCategories, selectedCategory]
  );

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Send Push Notification</CardTitle>
          <Badge variant="secondary">OneSignal</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-blue-50 text-blue-800 text-sm p-3">
          Use Dry Run to preview the payload and audience selection without
          sending.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1 space-y-1">
            <Label htmlFor="template-category" className="text-sm">
              Template Category
            </Label>
            <select
              id="template-category"
              className="w-full border rounded-md px-3 py-2 bg-white text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryNames.map((c) => (
                <option key={c} value={c} className="text-foreground">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.name}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTitle(p.title);
                    setMessage(p.message);
                  }}
                  title={`Apply ${p.name} preset`}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="push-title" className="block text-sm font-medium">
            Title *
          </label>
          <Input
            id="push-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="push-message" className="block text-sm font-medium">
            Message *
          </label>
          <Textarea
            id="push-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Notification message"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="push-url" className="block text-sm font-medium">
            Optional URL
          </label>
          <Input
            id="push-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Audience Segments</Label>
            <div className="flex flex-wrap gap-2">
              {["Subscribed Users", "Active 7d", "Inactive 30d"].map((seg) => {
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
            <Label className="text-sm">Max Audience (hint)</Label>
            <Input
              type="number"
              min={1}
              max={100000}
              value={maxAudience}
              onChange={(e) => setMaxAudience(Number(e.target.value) || 1)}
            />
            <p className="text-xs text-gray-500">
              Provider-side segmentation applies; this is informational only.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch id="dryRun" checked={dryRun} onCheckedChange={setDryRun} />
          <Label htmlFor="dryRun">Dry run (preview only)</Label>
        </div>
        {!dryRun && (
          <div className="flex items-center gap-3">
            <Switch
              id="confirmLive"
              checked={confirmLive}
              onCheckedChange={setConfirmLive}
            />
            <Label htmlFor="confirmLive">
              I confirm this live send to selected segments
            </Label>
          </div>
        )}
        {!dryRun && !confirmLive && (
          <div className="text-sm text-red-600">
            Confirmation is required for live sends. Toggle the confirmation
            switch above.
          </div>
        )}

        <div className="rounded-md border p-3 text-sm bg-gray-50">
          <div className="font-medium mb-1">Preview</div>
          <pre className="whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(
              {
                title: title.trim() || "(none)",
                message: message.trim() || "(none)",
                url: url.trim() || undefined,
                audience: segments,
                dryRun,
                confirm: !dryRun && confirmLive,
                maxAudience,
              },
              null,
              2
            )}
          </pre>
          <div className="text-xs text-gray-500 mt-2">
            Estimated audience depends on provider segmentation; use Dry Run to
            verify payload.
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={
            sending ||
            !title.trim() ||
            !message.trim() ||
            (!dryRun && !confirmLive)
          }
        >
          {sending
            ? dryRun
              ? "Previewing..."
              : "Sending..."
            : dryRun
              ? "Preview"
              : "Send Notification"}
        </Button>
      </CardContent>
    </Card>
  );
}
