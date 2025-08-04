"use client";

import { useState } from "react";
import { sendMarketingEmail } from "@/lib/marketingEmailApi";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
];

export default function MarketingEmailAdminPage() {
  // Cookie-auth; remove token from context and API
  useAuthContext(); // keep hook for gating if needed
  const [templateKey, setTemplateKey] = useState<string>(
    TEMPLATE_OPTIONS[0].key
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      // Server reads HttpOnly cookies
      await sendMarketingEmail("", { templateKey });
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
        <Button onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : "Send Email to All Users"}
        </Button>
      </CardContent>
    </Card>
  );
}
