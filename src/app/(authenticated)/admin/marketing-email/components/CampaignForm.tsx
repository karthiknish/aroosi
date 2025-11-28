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
import { FileText, Mail, Split, Info, ExternalLink, LayoutTemplate } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-rose-600" />
          Campaign Content
        </CardTitle>
        <CardDescription>
          Choose a pre-made template or design a custom email from scratch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger 
              value="template" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm transition-all"
            >
              <LayoutTemplate className="h-4 w-4" />
              Use Template
            </TabsTrigger>
            <TabsTrigger 
              value="custom" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm transition-all"
            >
              <Mail className="h-4 w-4" />
              Custom Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="template-select">Select Template</Label>
                <Link href="/admin/marketing-email/templates" className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium">
                  Browse Gallery <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <Select value={templateKey} onValueChange={setTemplateKey}>
                <SelectTrigger id="template-select" className="w-full bg-white border-slate-200 focus:ring-rose-500">
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
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm flex gap-3 items-start">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-blue-900">Template Details</div>
                  <div className="text-blue-700">
                    Key: <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">{selectedTemplate.key}</span>
                    <span className="mx-2 text-blue-300">•</span>
                    Category: <span className="font-medium">{selectedTemplate.category}</span>
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
                      className="pr-8 border-slate-200 focus-visible:ring-rose-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm font-medium">%</span>
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
                      className="pr-8 border-slate-200 focus-visible:ring-rose-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm font-medium">%</span>
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
                    className="border-slate-200 focus-visible:ring-rose-500"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <Label htmlFor="custom-subject">Subject Line</Label>
              <Input
                id="custom-subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="e.g. Don't miss out on this offer!"
                className="border-slate-200 focus-visible:ring-rose-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preheader">Preheader Text</Label>
              <Input
                id="preheader"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Short preview text shown in inbox list view"
                className="border-slate-200 focus-visible:ring-rose-500"
              />
            </div>
            
            <div className="flex items-center gap-2 py-2">
              <Switch
                id="use-editor"
                checked={useEditor}
                onCheckedChange={setUseEditor}
                className="data-[state=checked]:bg-rose-600"
              />
              <Label htmlFor="use-editor" className="cursor-pointer font-medium text-slate-700">
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
                className="font-mono text-sm leading-relaxed border-slate-200 focus-visible:ring-rose-500"
                placeholder={useEditor ? "Start typing your content..." : "<html>\n  <body>\n    ...\n  </body>\n</html>"}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* A/B Testing Section */}
        <div className="border-t border-slate-100 pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-md">
                <Split className="h-4 w-4 text-purple-600" />
              </div>
              <Label htmlFor="ab-enabled" className="text-base font-medium cursor-pointer text-slate-900">
                A/B Subject Testing
              </Label>
            </div>
            <Switch
              id="ab-enabled"
              checked={abEnabled}
              onCheckedChange={setAbEnabled}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {abEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="ab-a" className="text-purple-900 font-medium">Variant A (Control)</Label>
                <Input
                  id="ab-a"
                  value={abSubjectA}
                  onChange={(e) => setAbSubjectA(e.target.value)}
                  placeholder="Original subject line"
                  className="border-purple-200 focus-visible:ring-purple-500 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ab-b" className="text-purple-900 font-medium">Variant B (Test)</Label>
                <Input
                  id="ab-b"
                  value={abSubjectB}
                  onChange={(e) => setAbSubjectB(e.target.value)}
                  placeholder="Alternative subject line"
                  className="border-purple-200 focus-visible:ring-purple-500 bg-white"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                <div className="flex justify-between text-sm font-medium text-purple-900">
                  <span>Traffic Split</span>
                  <span>{abRatio}% A / {100 - abRatio}% B</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-purple-100 rounded-full overflow-hidden ring-1 ring-purple-200">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-300" 
                      style={{ width: `${Math.max(0, Math.min(100, abRatio))}%` }}
                    />
                  </div>
                  <div className="relative">
                    <Input
                      id="ab-ratio"
                      type="number"
                      min={1}
                      max={99}
                      value={abRatio}
                      onChange={(e) =>
                        setAbRatio(parseInt(e.target.value || "50", 10))
                      }
                      className="w-20 text-center border-purple-200 focus-visible:ring-purple-500 pr-6"
                    />
                    <span className="absolute right-3 top-2.5 text-purple-400 text-xs">%</span>
                  </div>
                </div>
                <p className="text-xs text-purple-600 bg-purple-50/50 p-2 rounded border border-purple-100/50">
                  <Info className="w-3 h-3 inline mr-1 -mt-0.5" />
                  We'll send Variant A to {abRatio}% of your audience and Variant B to the remaining {100 - abRatio}%.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
