"use client";

import { useState } from "react";
import { sendMarketingEmail } from "@/lib/marketingEmailApi";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { showSuccessToast } from "@/lib/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATE_OPTIONS = [
  {
    key: "profileCompletionReminder",
    label: "Profile Completion Reminder",
  },
  {
    key: "premiumPromo",
    label: "Premium Promo (30% off)",
  },
  {
    key: "recommendedProfiles",
    label: "Recommended Profiles Digest",
  },
];

export default function MarketingEmailAdminPage() {
  // Cookie-auth; remove token from context and API
  useAuthContext(); // keep hook for gating if needed
  const [templateKey, setTemplateKey] = useState<string>(
    TEMPLATE_OPTIONS[0].key
  );
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [maxAudience, setMaxAudience] = useState<number>(500);
  // const [preview, setPreview] = useState<string>("");
  const [mode, setMode] = useState<"template" | "custom">("template");
  // Template params
  const [discountPct, setDiscountPct] = useState<number>(30);
  const [daysSinceLastLogin, setDaysSinceLastLogin] = useState<number>(7);
  const [completionPct, setCompletionPct] = useState<number>(70);
  // Custom mode fields
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const handleSend = async () => {
    setSending(true);
    try {
      const params: Record<string, unknown> = {};
      if (templateKey === "premiumPromo") params.args = [discountPct];
      if (templateKey === "profileCompletionReminder")
        params.args = [completionPct];
      if (templateKey === "reEngagement") params.args = [daysSinceLastLogin];

      const res = await sendMarketingEmail("", {
        templateKey: mode === "template" ? templateKey : undefined,
        subject: mode === "custom" ? customSubject : undefined,
        body: mode === "custom" ? customBody : undefined,
        params,
        confirm: !dryRun,
        dryRun,
        maxAudience,
      });
      if (res.success)
        showSuccessToast(dryRun ? "Preview generated" : "Campaign started");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Send Marketing Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="template">Use Template</TabsTrigger>
            <TabsTrigger value="custom">Custom Email</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <div>
              <label htmlFor="template-select" className="block text-sm font-medium mb-1">
                Select Template
              </label>
              <Select value={templateKey} onValueChange={setTemplateKey}>
                <SelectTrigger id="template-select" className="w-full">
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Per-template params */}
            {templateKey === "premiumPromo" && (
              <div>
                <label htmlFor="discount-pct" className="block text-sm mb-1">Discount %</label>
                <Input
                  id="discount-pct"
                  type="number"
                  min={5}
                  max={90}
                  value={discountPct}
                  onChange={(e) =>
                    setDiscountPct(parseInt(e.target.value || "0", 10))
                  }
                />
              </div>
            )}
            {templateKey === "profileCompletionReminder" && (
              <div>
                <label htmlFor="completion-pct" className="block text-sm mb-1">Completion %</label>
                <Input
                  id="completion-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={completionPct}
                  onChange={(e) =>
                    setCompletionPct(parseInt(e.target.value || "0", 10))
                  }
                />
              </div>
            )}
            {templateKey === "reEngagement" && (
              <div>
                <label htmlFor="days-since-login" className="block text-sm mb-1">
                  Days since last login
                </label>
                <Input
                  id="days-since-login"
                  type="number"
                  min={1}
                  max={365}
                  value={daysSinceLastLogin}
                  onChange={(e) =>
                    setDaysSinceLastLogin(parseInt(e.target.value || "0", 10))
                  }
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div>
              <label htmlFor="custom-subject" className="block text-sm mb-1">Subject</label>
              <Input
                id="custom-subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Your subject line"
              />
            </div>
            <div>
              <label htmlFor="custom-body" className="block text-sm mb-1">HTML Body</label>
              <Textarea
                id="custom-body"
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={10}
                placeholder="HTML content for the email"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="dry-run" className="flex items-center gap-2 text-sm">
            <input
              id="dry-run"
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Dry run (no emails sent)
          </label>
          <div>
            <label htmlFor="max-audience" className="block text-sm mb-1">Max audience</label>
            <Input
              id="max-audience"
              type="number"
              min={1}
              max={10000}
              value={maxAudience}
              onChange={(e) =>
                setMaxAudience(parseInt(e.target.value || "0", 10))
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSend} disabled={sending}>
            {sending
              ? dryRun
                ? "Generating preview..."
                : "Sending..."
              : dryRun
                ? "Preview"
                : "Send Email to Users"}
          </Button>
        </div>

        {/* Live preview (client-side) */}
        <div className="border rounded-md p-3">
          <div className="text-sm font-medium mb-2">Live Preview</div>
          {mode === "custom" ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: customBody || "<p>Preview will appear here...</p>",
              }}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Preview is available via Dry run (shows first 5 subjects). For
              full HTML preview, send yourself a small-audience test.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
