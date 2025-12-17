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
        <Card className="border-0 shadow-lg bg-base-light">
          <CardHeader className="pb-6 border-b border-neutral/10">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary rounded-xl shadow-sm">
                <Send className="h-5 w-5 text-white" />
              </div>
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            {/* Safety Notice */}
            <div className="rounded-xl bg-info/10 text-info-dark p-4 border border-info/20 flex items-start gap-3">
              <div className="p-1.5 bg-info/20 rounded-lg mt-0.5">
                <AlertTriangle className="h-4 w-4 text-info" />
              </div>
              <div className="text-sm">
                <span className="font-semibold block mb-1">Safety Mode Active</span>
                Use <strong>Dry Run</strong> to preview the payload and audience without sending. Always test before live sends.
              </div>
            </div>

            {/* Quick Start Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-neutral-dark font-semibold">
                <Zap className="h-4 w-4 text-warning" />
                <h3>Quick Start Templates</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-neutral/5 p-4 rounded-xl border border-neutral/10">
                <div className="space-y-2">
                  <Label
                    htmlFor="template-category"
                    className="text-xs font-semibold text-neutral uppercase tracking-wider"
                  >
                    Category
                  </Label>
                  <select
                    id="template-category"
                    className="w-full border border-neutral/20 rounded-lg px-3 py-2 bg-base-light text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                  <Label className="text-xs font-semibold text-neutral uppercase tracking-wider">
                    Presets
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <Button
                        key={p.name}
                        size="sm"
                        variant="outline"
                        className="bg-base-light hover:bg-primary/5 hover:border-primary/20 hover:text-primary-dark transition-all text-xs h-9"
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
              <div className="flex items-center gap-2 text-neutral-dark font-semibold border-t border-neutral/10 pt-6">
                <Bell className="h-4 w-4 text-primary" />
                <h3>Content</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Essential Fields */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="push-title" className="text-sm font-semibold text-neutral-dark flex items-center justify-between">
                      <span>Title <span className="text-danger">*</span></span>
                      <span className={`text-xs font-normal ${title.length > 65 ? "text-danger" : "text-neutral/60"}`}>
                        {title.length}/65
                      </span>
                    </Label>
                    <Input
                      id="push-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter notification title"
                      maxLength={65}
                      className="border-neutral/20 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="push-message" className="text-sm font-semibold text-neutral-dark flex items-center justify-between">
                      <span>Message <span className="text-danger">*</span></span>
                      <span className={`text-xs font-normal ${message.length > 240 ? "text-danger" : "text-neutral/60"}`}>
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
                      className="border-neutral/20 focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="space-y-4 p-5 bg-neutral/5 rounded-xl border border-neutral/10">
                  <h4 className="text-sm font-semibold text-neutral-dark flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-neutral/40" />
                    Additional Options
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="push-url" className="text-xs font-medium text-neutral uppercase tracking-wider flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Action URL
                      </Label>
                      <Input
                        id="push-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://aroosi.com/..."
                        className="bg-base-light border-neutral/20 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="push-image" className="text-xs font-medium text-neutral uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Image URL
                      </Label>
                      <Input
                        id="push-image"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://aroosi.com/images/..."
                        className="bg-base-light border-neutral/20 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-neutral-dark flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-warning rounded-full"></div>
                      Advanced Configuration
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 border border-neutral/10 rounded-xl">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-neutral uppercase tracking-wider">
                        Custom Data (JSON)
                      </Label>
                      <Textarea
                        value={dataJson}
                        onChange={(e) => setDataJson(e.target.value)}
                        rows={3}
                        placeholder='{"type":"new_message","conversationId":"..."}'
                        className="font-mono text-xs bg-neutral/5 border-neutral/20 focus:ring-2 focus:ring-warning focus:border-warning transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-neutral uppercase tracking-wider">
                        Action Buttons (JSON)
                      </Label>
                      <Textarea
                        value={buttonsJson}
                        onChange={(e) => setButtonsJson(e.target.value)}
                        rows={2}
                        placeholder='[{"id":"view","text":"View","icon":"👁️"}]'
                        className="font-mono text-xs bg-neutral/5 border-neutral/20 focus:ring-2 focus:ring-warning focus:border-warning transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audience Configuration */}
            <div className="space-y-6 border-t border-neutral/10 pt-6">
              <div className="flex items-center gap-2 text-neutral-dark font-semibold">
                <Users className="h-4 w-4 text-secondary" />
                <h3>Audience & Targeting</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Target Segments */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-neutral uppercase tracking-wider">
                    Include Segments
                  </Label>
                  <div className="flex flex-wrap gap-2 p-4 bg-secondary/5 rounded-xl border border-secondary/20">
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
                              ? "bg-secondary hover:bg-secondary-dark text-white border-transparent shadow-sm" 
                              : "bg-base-light hover:bg-secondary/10 text-neutral border-neutral/20"
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
                  <Label className="text-xs font-medium text-neutral uppercase tracking-wider">
                    Exclude Segments
                  </Label>
                  <div className="flex flex-wrap gap-2 p-4 bg-danger/5 rounded-xl border border-danger/20">
                    {["Dormant", "Churn Risk"].map((seg) => {
                      const active = excludedSegments.includes(seg);
                      return (
                        <Button
                          key={seg}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={`transition-all ${
                            active 
                              ? "bg-danger hover:bg-danger-dark text-white border-transparent shadow-sm" 
                              : "bg-base-light hover:bg-danger/10 text-neutral border-neutral/20"
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
          <Card className="border-0 shadow-lg bg-base-light overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-secondary"></div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-dark">Send Configuration</h3>
                <Badge variant={dryRun ? "outline" : "default"} className={dryRun ? "text-neutral" : "bg-primary"}>
                  {dryRun ? "Preview Mode" : "Live Mode"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral/5 rounded-lg border border-neutral/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-neutral-dark">Dry Run</Label>
                    <p className="text-xs text-neutral">Simulate without sending</p>
                  </div>
                  <Switch
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                </div>

                {!dryRun && (
                  <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg border border-danger/20 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-danger-dark">Confirm Live Send</Label>
                      <p className="text-xs text-danger">Required for production</p>
                    </div>
                    <Switch
                      checked={confirmLive}
                      onCheckedChange={setConfirmLive}
                      className="data-[state=checked]:bg-danger"
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
                      ? "bg-neutral-dark hover:bg-neutral-darker text-white shadow-lg shadow-neutral/20"
                      : "bg-gradient-to-r from-primary-dark to-secondary hover:from-primary-darker hover:to-secondary-dark text-white shadow-lg shadow-primary/20"
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
