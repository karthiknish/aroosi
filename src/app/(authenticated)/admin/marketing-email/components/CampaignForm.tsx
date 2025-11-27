import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Mail, Split, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type TemplateItem = { key: string; label: string; category: string };

interface CampaignFormProps {
  mode: "template" | "custom";
  setMode: (mode: "template" | "custom") => void;
  templates: TemplateItem[];
  templateKey: string;
  setTemplateKey: (key: string) => void;
  discountPct: number;
  setDiscountPct: (val: number) => void;
  daysSinceLastLogin: number;
  setDaysSinceLastLogin: (val: number) => void;
  completionPct: number;
  setCompletionPct: (val: number) => void;
  customSubject: string;
  setCustomSubject: (val: string) => void;
  customBody: string;
  setCustomBody: (val: string) => void;
  preheader: string;
  setPreheader: (val: string) => void;
  useEditor: boolean;
  setUseEditor: (val: boolean) => void;
  abEnabled: boolean;
  setAbEnabled: (val: boolean) => void;
  abSubjectA: string;
  setAbSubjectA: (val: string) => void;
  abSubjectB: string;
  setAbSubjectB: (val: string) => void;
  abRatio: number;
  setAbRatio: (val: number) => void;
}

export function CampaignForm({
  mode,
  setMode,
  templates,
  templateKey,
  setTemplateKey,
  discountPct,
  setDiscountPct,
  daysSinceLastLogin,
  setDaysSinceLastLogin,
  completionPct,
  setCompletionPct,
  customSubject,
  setCustomSubject,
  customBody,
  setCustomBody,
  preheader,
  setPreheader,
  useEditor,
  setUseEditor,
  abEnabled,
  setAbEnabled,
  abSubjectA,
  setAbSubjectA,
  abSubjectB,
  setAbSubjectB,
  abRatio,
  setAbRatio,
}: CampaignFormProps) {
  const selectedTemplate = templates.find((t) => t.key === templateKey);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4 border-b bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-pink-600" />
          Campaign Content
        </CardTitle>
        <CardDescription>
          Choose a pre-made template or design a custom email from scratch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Use Template
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Custom Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="template-select">Select Template</Label>
              <Select value={templateKey} onValueChange={setTemplateKey}>
                <SelectTrigger id="template-select" className="w-full bg-white">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm flex gap-3 items-start">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-blue-900">Template Details</div>
                  <div className="text-blue-700">
                    Key: <span className="font-mono bg-blue-100 px-1 rounded">{selectedTemplate.key}</span>
                    <span className="mx-2">•</span>
                    Category: {selectedTemplate.category}
                  </div>
                </div>
              </div>
            )}

            {/* Template-specific parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templateKey === "premiumPromo" && (
                <div className="space-y-2">
                  <Label htmlFor="discount-pct">Discount Percentage</Label>
                  <div className="relative">
                    <Input
                      id="discount-pct"
                      type="number"
                      min={5}
                      max={90}
                      value={discountPct}
                      onChange={(e) =>
                        setDiscountPct(parseInt(e.target.value || "0", 10))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                  </div>
                </div>
              )}
              {templateKey === "profileCompletionReminder" && (
                <div className="space-y-2">
                  <Label htmlFor="completion-pct">Target Completion %</Label>
                  <div className="relative">
                    <Input
                      id="completion-pct"
                      type="number"
                      min={0}
                      max={100}
                      value={completionPct}
                      onChange={(e) =>
                        setCompletionPct(parseInt(e.target.value || "0", 10))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                  </div>
                </div>
              )}
              {templateKey === "reEngagement" && (
                <div className="space-y-2">
                  <Label htmlFor="days-since-login">Days Since Last Login</Label>
                  <Input
                    id="days-since-login"
                    type="number"
                    min={1}
                    max={365}
                    value={daysSinceLastLogin}
                    onChange={(e) =>
                      setDaysSinceLastLogin(parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="custom-subject">Subject Line</Label>
              <Input
                id="custom-subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="e.g. Don't miss out on this offer!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preheader">Preheader Text</Label>
              <Input
                id="preheader"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Short preview text shown in inbox list view"
              />
            </div>
            
            <div className="flex items-center gap-2 py-2">
              <Switch
                id="use-editor"
                checked={useEditor}
                onCheckedChange={setUseEditor}
              />
              <Label htmlFor="use-editor" className="cursor-pointer">
                Use Visual Editor (WYSIWYG)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-body">Email Body (HTML)</Label>
              <Textarea
                id="custom-body"
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={12}
                className="font-mono text-sm leading-relaxed"
                placeholder={useEditor ? "Start typing your content..." : "<html>\n  <body>\n    ...\n  </body>\n</html>"}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* A/B Testing Section */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Split className="h-5 w-5 text-purple-600" />
              <Label htmlFor="ab-enabled" className="text-base font-medium cursor-pointer">
                A/B Subject Testing
              </Label>
            </div>
            <Switch
              id="ab-enabled"
              checked={abEnabled}
              onCheckedChange={setAbEnabled}
            />
          </div>

          {abEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-purple-50/50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="ab-a" className="text-purple-900">Variant A (Control)</Label>
                <Input
                  id="ab-a"
                  value={abSubjectA}
                  onChange={(e) => setAbSubjectA(e.target.value)}
                  placeholder="Original subject line"
                  className="border-purple-200 focus-visible:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ab-b" className="text-purple-900">Variant B (Test)</Label>
                <Input
                  id="ab-b"
                  value={abSubjectB}
                  onChange={(e) => setAbSubjectB(e.target.value)}
                  placeholder="Alternative subject line"
                  className="border-purple-200 focus-visible:ring-purple-500"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-3">
                <div className="flex justify-between text-sm font-medium text-purple-900">
                  <span>Traffic Split</span>
                  <span>{abRatio}% A / {100 - abRatio}% B</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-purple-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-300" 
                      style={{ width: `${Math.max(0, Math.min(100, abRatio))}%` }}
                    />
                  </div>
                  <Input
                    id="ab-ratio"
                    type="number"
                    min={1}
                    max={99}
                    value={abRatio}
                    onChange={(e) =>
                      setAbRatio(parseInt(e.target.value || "50", 10))
                    }
                    className="w-20 text-center border-purple-200"
                  />
                </div>
                <p className="text-xs text-purple-700">
                  Determine what percentage of users receive Variant A. The rest will receive Variant B.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
