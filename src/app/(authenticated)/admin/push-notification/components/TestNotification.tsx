import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  TestTube,
  Send,
  Smartphone,
  AlertTriangle,
  Copy,
} from "lucide-react";

interface TestNotificationProps {
  // Form state
  testTitle: string;
  setTestTitle: (value: string) => void;
  testMessage: string;
  setTestMessage: (value: string) => void;
  testUrl: string;
  setTestUrl: (value: string) => void;
  testImageUrl: string;
  setTestImageUrl: (value: string) => void;
  testPlayerId: string;
  setTestPlayerId: (value: string) => void;

  // Action handlers
  handleTestSend: () => void;
  testSending: boolean;
  testResult: any;
  copyToClipboard: (text: string) => void;
}

export function TestNotification({
  testTitle,
  setTestTitle,
  testMessage,
  setTestMessage,
  testUrl,
  setTestUrl,
  testImageUrl,
  setTestImageUrl,
  testPlayerId,
  setTestPlayerId,
  handleTestSend,
  testSending,
  testResult,
  copyToClipboard,
}: TestNotificationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Notification
        </CardTitle>
        <p className="text-sm text-gray-600">
          Send a test notification to verify your setup and preview how it will appear
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Safety Notice */}
        <div className="rounded-lg bg-amber-50 text-amber-800 p-4 border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Test Mode</span>
          </div>
          <p className="mt-1 text-sm">
            Test notifications are sent to specific devices only and won't affect your audience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Form */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-title" className="text-sm font-medium">
                  Test Title
                </Label>
                <Input
                  id="test-title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Test notification title"
                  maxLength={65}
                />
                <div className="text-xs text-gray-500">
                  {testTitle.length}/65 characters
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-message" className="text-sm font-medium">
                  Test Message
                </Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={4}
                  placeholder="Test notification message"
                  maxLength={240}
                />
                <div className="text-xs text-gray-500">
                  {testMessage.length}/240 characters
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-url" className="text-sm font-medium">
                    Action URL (Optional)
                  </Label>
                  <Input
                    id="test-url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://aroosi.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-image" className="text-sm font-medium">
                    Image URL (Optional)
                  </Label>
                  <Input
                    id="test-image"
                    value={testImageUrl}
                    onChange={(e) => setTestImageUrl(e.target.value)}
                    placeholder="https://aroosi.com/images/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-player-id" className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Target Device Player ID
                </Label>
                <Input
                  id="test-player-id"
                  value={testPlayerId}
                  onChange={(e) => setTestPlayerId(e.target.value)}
                  placeholder="Player ID from Devices tab"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Get Player ID from the Devices tab to test specific devices
                </p>
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleTestSend}
              disabled={testSending || !testTitle.trim() || !testMessage.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              size="lg"
            >
              {testSending ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Sending Test...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  <span>Send Test Notification</span>
                </div>
              )}
            </Button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Results</h3>

            {testResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Test Successful
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Notification sent successfully to test device.
                  </p>
                </div>

                {/* Response Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">API Response</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(testResult, null, 2))
                      }
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <TestTube className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No test results yet</p>
                <p className="text-xs mt-1">
                  Send a test notification to see the results here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Test Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Testing Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use a real device Player ID from the Devices tab for accurate testing</li>
            <li>• Test notifications won't count toward your monthly quota</li>
            <li>• Include an image URL to test rich notifications</li>
            <li>• Check the API response for detailed delivery information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
