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
  Zap,
  Settings,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { NotificationPreview } from "./NotificationPreview";
import { Switch } from "@/components/ui/switch";

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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Left Column: Form */}
      <div className="xl:col-span-7 space-y-6">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-6 border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-pink-500 rounded-xl shadow-sm">
                <Send className="h-5 w-5 text-white" />
              </div>
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            {/* Safety Notice */}
            <div className="rounded-xl bg-blue-50 text-blue-800 p-4 border border-blue-100 flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg mt-0.5">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <span className="font-semibold block mb-1">Safety Mode Active</span>
                Use <strong>Dry Run</strong> to preview the payload and audience without sending. Always test before live sends.
              </div>
            </div>

            {/* Quick Start Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Zap className="h-4 w-4 text-amber-500" />
                <h3>Quick Start Templates</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label
                    htmlFor="template-category"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Category
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
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Presets
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <Button
                        key={p.name}
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700 transition-all text-xs h-9"
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

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold border-t border-slate-100 pt-6">
                <Bell className="h-4 w-4 text-pink-500" />
                <h3>Content</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Essential Fields */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="push-title" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                      <span>Title <span className="text-red-500">*</span></span>
                      <span className={`text-xs font-normal ${title.length > 65 ? "text-red-500" : "text-slate-400"}`}>
                        {title.length}/65
                      </span>
                    </Label>
                    <Input
                      id="push-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter notification title"
                      maxLength={65}
                      className="border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="push-message" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                      <span>Message <span className="text-red-500">*</span></span>
                      <span className={`text-xs font-normal ${message.length > 240 ? "text-red-500" : "text-slate-400"}`}>
                        {message.length}/240
                      </span>
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
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-slate-400" />
                    Additional Options
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="push-url" className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Action URL
                      </Label>
                      <Input
                        id="push-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://aroosi.com/..."
                        className="bg-white border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="push-image" className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Image URL
                      </Label>
                      <Input
                        id="push-image"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://aroosi.com/images/..."
                        className="bg-white border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                      Advanced Configuration
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 border border-slate-100 rounded-xl">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Custom Data (JSON)
                      </Label>
                      <Textarea
                        value={dataJson}
                        onChange={(e) => setDataJson(e.target.value)}
                        rows={3}
                        placeholder='{"type":"new_message","conversationId":"..."}'
                        className="font-mono text-xs bg-slate-50 border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Action Buttons (JSON)
                      </Label>
                      <Textarea
                        value={buttonsJson}
                        onChange={(e) => setButtonsJson(e.target.value)}
                        rows={2}
                        placeholder='[{"id":"view","text":"View","icon":"👁️"}]'
                        className="font-mono text-xs bg-slate-50 border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audience Configuration */}
            <div className="space-y-6 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Users className="h-4 w-4 text-indigo-500" />
                <h3>Audience & Targeting</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Target Segments */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Include Segments
                  </Label>
                  <div className="flex flex-wrap gap-2 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
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
                          className={`transition-all ${
                            active 
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm" 
                              : "bg-white hover:bg-indigo-50 text-slate-600 border-slate-200"
                          }`}
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

                {/* Exclude Segments */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Exclude Segments
                  </Label>
                  <div className="flex flex-wrap gap-2 p-4 bg-red-50/30 rounded-xl border border-red-100">
                    {["Dormant", "Churn Risk"].map((seg) => {
                      const active = excludedSegments.includes(seg);
                      return (
                        <Button
                          key={seg}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={`transition-all ${
                            active 
                              ? "bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm" 
                              : "bg-white hover:bg-red-50 text-slate-600 border-slate-200"
                          }`}
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
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Preview & Actions */}
      <div className="xl:col-span-5 space-y-6">
        <div className="sticky top-6 space-y-6">
          {/* Send Actions Card */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 to-purple-600"></div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Send Configuration</h3>
                <Badge variant={dryRun ? "outline" : "default"} className={dryRun ? "text-slate-500" : "bg-pink-500"}>
                  {dryRun ? "Preview Mode" : "Live Mode"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-slate-700">Dry Run</Label>
                    <p className="text-xs text-slate-500">Simulate without sending</p>
                  </div>
                  <Switch
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                </div>

                {!dryRun && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-red-700">Confirm Live Send</Label>
                      <p className="text-xs text-red-500">Required for production</p>
                    </div>
                    <Switch
                      checked={confirmLive}
                      onCheckedChange={setConfirmLive}
                      className="data-[state=checked]:bg-red-600"
                    />
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    !title.trim() ||
                    !message.trim() ||
                    (!dryRun && !confirmLive)
                  }
                  className={`w-full h-12 text-base transition-all duration-300 ${
                    dryRun
                      ? "bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-200"
                      : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg shadow-pink-200"
                  }`}
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {dryRun ? <Eye className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                      <span>{dryRun ? "Generate Preview" : "Send Notification"}</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Component */}
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
        </div>
      </div>
    </div>
  );
}
