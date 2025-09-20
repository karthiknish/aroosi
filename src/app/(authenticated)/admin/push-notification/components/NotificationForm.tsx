import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Send,
  Eye,
  AlertTriangle,
  Copy,
  Users,
  Clock,
} from "lucide-react";
import { NotificationPreview } from "./NotificationPreview";

interface NotificationFormProps {
  // Form state
  title: string;
  setTitle: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  dataJson: string;
  setDataJson: (value: string) => void;
  buttonsJson: string;
  setButtonsJson: (value: string) => void;

  // Template state
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categoryNames: string[];
  presets: { name: string; title: string; message: string; imageUrl?: string }[];
  setAppliedTemplateId: (value: string | null) => void;

  // Audience state
  segments: string[];
  setSegments: (value: string[] | ((prev: string[]) => string[])) => void;
  excludedSegments: string[];
  setExcludedSegments: (value: string[] | ((prev: string[]) => string[])) => void;
  maxAudience: number;
  setMaxAudience: (value: number) => void;

  // Scheduling state
  dryRun: boolean;
  setDryRun: (value: boolean) => void;
  confirmLive: boolean;
  setConfirmLive: (value: boolean) => void;

  // Action handlers
  handleSend: () => void;
  sending: boolean;
  previewData: any;
  copyToClipboard: (text: string) => void;
}

export function NotificationForm({
  title,
  setTitle,
  message,
  setMessage,
  url,
  setUrl,
  imageUrl,
  setImageUrl,
  dataJson,
  setDataJson,
  buttonsJson,
  setButtonsJson,
  selectedCategory,
  setSelectedCategory,
  categoryNames,
  presets,
  setAppliedTemplateId,
  segments,
  setSegments,
  excludedSegments,
  setExcludedSegments,
  maxAudience,
  setMaxAudience,
  dryRun,
  setDryRun,
  confirmLive,
  setConfirmLive,
  handleSend,
  sending,
  previewData,
  copyToClipboard,
}: NotificationFormProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-pink-500 rounded-xl">
              <Send className="h-5 w-5 text-white" />
            </div>
            Compose Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Safety Notice */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 p-4 border border-blue-200/50">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-blue-500 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">Safety Mode Active</span>
            </div>
            <p className="mt-2 text-sm">
              Use <strong>Dry Run</strong> to preview the payload and audience without sending. Always test before live sends.
            </p>
          </div>

          {/* Quick Start Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-purple-500 rounded-lg">
                <Copy className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Quick Start Templates</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label
                  htmlFor="template-category"
                  className="text-sm font-medium text-slate-700"
                >
                  Template Category
                </Label>
                <select
                  id="template-category"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-slate-700">
                  Quick Templates
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {presets.map((p) => (
                    <Button
                      key={p.name}
                      size="sm"
                      variant="outline"
                      className="hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700 transition-all"
                      onClick={() => {
                        setTitle(p.title);
                        setMessage(p.message);
                        if (p.imageUrl) setImageUrl(p.imageUrl);
                        setAppliedTemplateId(null);
                      }}
                      title={`Apply ${p.name} preset`}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1 bg-green-500 rounded-lg">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Notification Content</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Essential Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="push-title" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    Title
                  </Label>
                  <Input
                    id="push-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter notification title"
                    maxLength={65}
                    className="border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Required field</span>
                    <span className={title.length > 65 ? "text-red-500" : "text-slate-500"}>
                      {title.length}/65 characters
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="push-message" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    Message
                  </Label>
                  <Textarea
                    id="push-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Enter notification message"
                    maxLength={240}
                    className="border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all resize-none"
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Required field</span>
                    <span className={message.length > 240 ? "text-red-500" : "text-slate-500"}>
                      {message.length}/240 characters
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-200">
                <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  Additional Options
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="push-url" className="text-sm font-medium text-slate-700">
                      Action URL
                    </Label>
                    <Input
                      id="push-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://aroosi.com/..."
                      className="border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="push-image" className="text-sm font-medium text-slate-700">
                      Image URL
                    </Label>
                    <Input
                      id="push-image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://aroosi.com/images/..."
                      className="border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Data */}
              <div className="space-y-4 p-4 bg-amber-50/30 rounded-lg border border-amber-200">
                <h4 className="text-sm font-medium text-amber-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  Advanced Configuration
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Custom Data (JSON)
                    </Label>
                    <Textarea
                      value={dataJson}
                      onChange={(e) => setDataJson(e.target.value)}
                      rows={4}
                      placeholder='{"type":"new_message","conversationId":"..."}'
                      className="border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Additional data sent with the notification payload
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Action Buttons (JSON)
                    </Label>
                    <Textarea
                      value={buttonsJson}
                      onChange={(e) => setButtonsJson(e.target.value)}
                      rows={3}
                      placeholder='[{"id":"view","text":"View","icon":"👁️"}]'
                      className="border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Supported keys: id, text, icon, url
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audience Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-indigo-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Audience & Targeting</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Target Segments */}
              <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Target Audience
                </h4>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">
                    Include Segments
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Subscribed Users",
                      "Active Users",
                      "Engaged Last 30d",
                    ].map((seg) => {
                      const active = segments.includes(seg);
                      return (
                        <Button
                          key={seg}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-green-600 hover:bg-green-700" : "hover:bg-green-50"}
                          onClick={() =>
                            setSegments((prev: string[]) =>
                              prev.includes(seg)
                                ? prev.filter((s: string) => s !== seg)
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
              </div>

              {/* Exclude Segments */}
              <div className="space-y-4 p-4 bg-red-50/50 rounded-lg border border-red-200">
                <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Exclude Segments
                </h4>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">
                    Remove from Target
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["Dormant", "Churn Risk"].map((seg) => {
                      const active = excludedSegments.includes(seg);
                      return (
                        <Button
                          key={seg}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-red-600 hover:bg-red-700" : "hover:bg-red-50"}
                          onClick={() =>
                            setExcludedSegments((prev: string[]) =>
                              prev.includes(seg)
                                ? prev.filter((s: string) => s !== seg)
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
              </div>
            </div>

            {/* Audience Limits */}
            <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Max Audience Size
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={100000}
                    value={maxAudience}
                    onChange={(e) =>
                      setMaxAudience(Number(e.target.value) || 1)
                    }
                    className="border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="text-sm text-slate-600">
                  <p>Provider-side segmentation applies</p>
                  <p className="text-xs">This limit is informational only</p>
                </div>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="space-y-4">
            <Button
              onClick={handleSend}
              disabled={
                sending ||
                !title.trim() ||
                !message.trim() ||
                (!dryRun && !confirmLive)
              }
              className={`w-full transition-all duration-300 ${
                dryRun
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                  : "bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 shadow-lg shadow-pink-500/25"
              }`}
              size="lg"
            >
              {sending ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">
                      {dryRun ? "Generating Preview..." : "Sending Notification..."}
                    </span>
                    <span className="text-xs opacity-90">
                      {dryRun ? "Building preview payload" : "Broadcasting to audience"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {dryRun ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">
                      {dryRun ? "Preview Notification" : "Send Notification"}
                    </span>
                    <span className="text-xs opacity-90">
                      {dryRun
                        ? "Safe preview mode - no actual send"
                        : `Live send to ${segments.join(", ")}`
                      }
                    </span>
                  </div>
                </div>
              )}
            </Button>

            {/* Send Status Indicators */}
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              {dryRun && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Preview Mode Active</span>
                </div>
              )}
              {!dryRun && confirmLive && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Live Send Confirmed</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreview
            title={title}
            message={message}
            imageUrl={imageUrl}
            segments={segments}
            maxAudience={maxAudience}
            dryRun={dryRun}
            url={url}
            previewData={previewData}
            onCopy={copyToClipboard}
          />

          {previewData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Payload Preview</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(previewData, null, 2))
                  }
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
