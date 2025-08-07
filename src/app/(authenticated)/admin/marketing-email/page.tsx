"use client";

import { useState } from "react";
import { sendMarketingEmail } from "@/lib/marketingEmailApi";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
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
  const [preview, setPreview] = useState<string>("");

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await sendMarketingEmail("", { templateKey, confirm: !dryRun, dryRun, maxAudience });
      if (res.success) {
        showSuccessToast(dryRun ? "Preview generated" : "Campaign started");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Send Marketing Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Template
          </label>
          <Select value={templateKey} onValueChange={setTemplateKey}>
            <SelectTrigger className="w-full">
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
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry run (no emails sent)
          </label>
          <div>
            <label className="block text-sm mb-1">Max audience</label>
            <Input type="number" min={1} max={10000} value={maxAudience} onChange={(e) => setMaxAudience(parseInt(e.target.value || "0", 10))} />
          </div>
        </div>
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (dryRun ? "Generating preview..." : "Sending...") : (dryRun ? "Preview" : "Send Email to Users")}
        </Button>
      </CardContent>
    </Card>
  );
}
