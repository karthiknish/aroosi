    import { useState, useCallback } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function usePushNotificationTest() {
  const [testPlayerId, setTestPlayerId] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestSend = useCallback(async (title: string, message: string, url?: string) => {
    const finalPlayerId = testPlayerId.trim();
    if (!finalPlayerId || !title.trim() || !message.trim()) {
      showErrorToast(null, "Player ID, title, and message are required for test");
      return;
    }

    setTestSending(true);
    try {
      const res = await fetch("/api/admin/push-notification/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: finalPlayerId,
          title: title.trim(),
          message: message.trim(),
          url: url?.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Test send failed");

      showSuccessToast("Test notification sent successfully");
      return true;
    } catch (error) {
      showErrorToast(null, "Failed to send test notification");
      return false;
    } finally {
      setTestSending(false);
    }
  }, [testPlayerId]);

  return {
    testPlayerId,
    setTestPlayerId,
    testSending,
    setTestSending,
    testTitle,
    setTestTitle,
    testMessage,
    setTestMessage,
    testUrl,
    setTestUrl,
    testImageUrl,
    setTestImageUrl,
    testResult,
    setTestResult,
    handleTestSend,
  };
}
