import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  TestTube,
  Smartphone,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Send,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7">
        <Card className="border-0 shadow-lg bg-white h-full">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-amber-500 rounded-xl">
                <TestTube className="h-5 w-5 text-white" />
              </div>
              Test Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Safety Notice */}
            <div className="rounded-xl bg-amber-50 text-amber-900 p-4 border border-amber-100 flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 rounded-lg mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-sm">
                <span className="font-semibold block mb-1">Sandbox Mode</span>
                Test notifications are sent to specific devices only and won&apos;t affect your general audience.
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="test-player-id" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-400" />
                  Target Device Player ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="test-player-id"
                    value={testPlayerId}
                    onChange={(e) => setTestPlayerId(e.target.value)}
                    placeholder="Paste Player ID here..."
                    className="font-mono text-sm bg-slate-50 border-slate-200 focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Copy a Player ID from the <strong>Devices</strong> tab to target a specific device.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-title" className="text-sm font-semibold text-slate-700">
                  Test Title
                </Label>
                <Input
                  id="test-title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Test notification title"
                  maxLength={65}
                  className="border-slate-200 focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-message" className="text-sm font-semibold text-slate-700">
                  Test Message
                </Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Test notification message"
                  maxLength={240}
                  className="border-slate-200 focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-url" className="text-sm font-medium text-slate-700">
                    Action URL
                  </Label>
                  <Input
                    id="test-url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://..."
                    className="border-slate-200 focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-image" className="text-sm font-medium text-slate-700">
                    Image URL
                  </Label>
                  <Input
                    id="test-image"
                    value={testImageUrl}
                    onChange={(e) => setTestImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="border-slate-200 focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              <Button
                onClick={handleTestSend}
                disabled={testSending || !testTitle.trim() || !testMessage.trim() || !testPlayerId.trim()}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 transition-all"
                size="lg"
              >
                {testSending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Sending Test...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>Send Test Notification</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <Card className="border-0 shadow-lg bg-white h-full">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {testResult ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 text-sm">Delivery Successful</h4>
                    <p className="text-xs text-green-700 mt-1">
                      The notification was successfully handed off to the push provider.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      API Response
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs hover:bg-slate-100"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(testResult, null, 2))
                      }
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </Button>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 overflow-hidden">
                    <pre className="text-[10px] text-slate-50 font-mono overflow-auto max-h-[300px]">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 min-h-[300px]">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <TestTube className="h-8 w-8 text-slate-300" />
                </div>
                <h4 className="font-medium text-slate-600">No results yet</h4>
                <p className="text-sm mt-1 max-w-[200px]">
                  Fill out the form and send a test notification to see the results here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
