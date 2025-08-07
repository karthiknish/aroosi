"use client";

import { useState } from "react";
import { sendPushNotification } from "@/lib/pushNotificationApi";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PushNotificationAdminPage() {
  // Cookie-auth; no token in context
  useAuthContext();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title || !message) return;
    setSending(true);
    try {
      // Server reads HttpOnly cookies for admin authorization
      await sendPushNotification({
        title,
        message,
        url: url || undefined,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Send Push Notification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Message *</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Notification message"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Optional URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <Button onClick={handleSend} disabled={sending || !title || !message}>
          {sending ? "Sending..." : "Send Notification"}
        </Button>
      </CardContent>
    </Card>
  );
}
