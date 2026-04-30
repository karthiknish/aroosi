import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

type TestSendPayload = {
  playerId: string;
  title: string;
  message: string;
  url?: string;
};

export function usePushNotificationTest() {
  const [testPlayerId, setTestPlayerId] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [testResult, setTestResult] = useState<unknown>(null);

  const testMutation = useMutation({
    mutationFn: (payload: TestSendPayload) => adminPushAPI.sendTest(payload),
    onSuccess: (result) => {
      setTestResult(result);
      handleApiOutcome({
        success: true,
        message: "Test notification sent successfully",
      });
    },
    onError: (error) => {
      handleError(error, {
        scope: "usePushNotificationTest",
        action: "send_test_notification",
      }, {
        customUserMessage: "Failed to send test notification",
      });
    },
  });

  const handleTestSend = useCallback(async (title: string, message: string, url?: string) => {
    const finalPlayerId = testPlayerId.trim();
    if (!finalPlayerId || !title.trim() || !message.trim()) {
      handleApiOutcome({
        warning: "Player ID, title, and message are required for test",
      });
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
