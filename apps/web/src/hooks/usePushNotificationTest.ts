import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function usePushNotificationTest() {
  const [testPlayerId, setTestPlayerId] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const testMutation = useMutation({
    mutationFn: (payload: any) => adminPushAPI.sendTest(payload),
    onSuccess: (result) => {
      setTestResult(result);
      showSuccessToast("Test notification sent successfully");
    },
    onError: (error: any) => {
      showErrorToast(error, "Failed to send test notification");
    },
  });

  const handleTestSend = useCallback(async (title: string, message: string, url?: string) => {
    const finalPlayerId = testPlayerId.trim();
    if (!finalPlayerId || !title.trim() || !message.trim()) {
      showErrorToast(null, "Player ID, title, and message are required for test");
      return;
    }

    testMutation.mutate({
      playerId: finalPlayerId,
      title: title.trim(),
      message: message.trim(),
      url: url?.trim() || undefined,
    });
  }, [testPlayerId, testMutation]);

  return {
    testPlayerId,
    setTestPlayerId,
    testSending: testMutation.isPending,
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
