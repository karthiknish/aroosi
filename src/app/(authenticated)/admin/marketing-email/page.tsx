"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sendMarketingEmail,
  listEmailTemplates,
  previewMarketingEmail,
  sendTestEmail,
  getEmailCampaigns,
  processOutboxBatch,
} from "@/lib/marketingEmailApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BuilderSchema, BuilderSection } from "@/lib/templateBuilder";
import Head from "next/head";
type TemplateItem = { key: string; label: string; category: string };

export default function MarketingEmailAdminPage() {
  // Cookie-auth; remove token from context and API
  useAuthContext(); // keep hook for gating if needed
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateKey, setTemplateKey] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [maxAudience, setMaxAudience] = useState<number>(500);
  const [sendToAll, setSendToAll] = useState<boolean>(false);
  const [sendToAllFromAuth, setSendToAllFromAuth] = useState<boolean>(false);
  // const [preview, setPreview] = useState<string>("");
  const [mode, setMode] = useState<"template" | "custom" | "builder">(
    "template"
  );
  const [useEditor, setUseEditor] = useState<boolean>(true);
  const [preheader, setPreheader] = useState<string>("");
  const [abEnabled, setAbEnabled] = useState<boolean>(false);
  const [abSubjectA, setAbSubjectA] = useState<string>("");
  const [abSubjectB, setAbSubjectB] = useState<string>("");
  const [abRatio, setAbRatio] = useState<number>(50);
  // Template params
  const [discountPct, setDiscountPct] = useState<number>(30);
  const [daysSinceLastLogin, setDaysSinceLastLogin] = useState<number>(7);
  const [completionPct, setCompletionPct] = useState<number>(70);
  // Custom mode fields
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  // Audience filters
  const [search, setSearch] = useState("");
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [plan, setPlan] = useState<string>("all");
  const [banned, setBanned] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(500);
  // Test email functionality
  const [testEmail, setTestEmail] = useState<string>("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showTestSection, setShowTestSection] = useState<boolean>(false);
  // Campaign history
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignHistory, setShowCampaignHistory] =
    useState<boolean>(false);
  const [processingOutbox, setProcessingOutbox] = useState(false);

  // Builder state
  const [builderSchema, setBuilderSchema] = useState<BuilderSchema>({
    subject: "",
    preheader: "",
    sections: [],
  });
  const addBuilderSection = (section: BuilderSection) => {
    setBuilderSchema((s) => ({ ...s, sections: [...s.sections, section] }));
  };
  const updateBuilderSection = (index: number, section: BuilderSection) => {
    setBuilderSchema((s) => ({
      ...s,
      sections: s.sections.map((sec, i) => (i === index ? section : sec)),
    }));
  };
  const removeBuilderSection = (index: number) => {
    setBuilderSchema((s) => ({
      ...s,
      sections: s.sections.filter((_, i) => i !== index),
    }));
  };
  const moveBuilderSection = (from: number, to: number) => {
    setBuilderSchema((s) => {
      const next = [...s.sections];
      if (to < 0 || to >= next.length) return s;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...s, sections: next };
    });
  };

  useEffect(() => {
    (async () => {
      const res = await listEmailTemplates();
      if (res.success && (res.data as any)?.templates) {
        const t = (res.data as any).templates as TemplateItem[];
        setTemplates(t);
        if (!templateKey && t.length > 0) setTemplateKey(t[0].key);
      }
    })();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.key === templateKey),
    [templates, templateKey]
  );

  // Prefill from query: ?template=key
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("template");
      if (t && !templateKey) setTemplateKey(t);
    } catch {}
  }, [templateKey]);

  const handleSend = async () => {
    // Validate form before sending
    const validationErrors = validateEmailForm();
    if (validationErrors.length > 0) {
      showErrorToast(null, validationErrors.join(", "));
      return;
    }

    setSending(true);
    try {
      const params: Record<string, unknown> = {};
      if (templateKey === "premiumPromo") params.args = [discountPct];
      if (templateKey === "profileCompletionReminder")
        params.args = [completionPct];
      if (templateKey === "reEngagement") params.args = [daysSinceLastLogin];

      const res = await sendMarketingEmail("", {
        templateKey: mode === "template" ? templateKey : undefined,
        subject: mode === "custom" ? customSubject : undefined,
        body: mode === "custom" ? customBody : undefined,
        params,
        confirm: !dryRun,
        dryRun,
        maxAudience,
        sendToAll,
        sendToAllFromAuth,
        preheader: mode === "custom" ? preheader : undefined,
        search: search || undefined,
        plan: plan !== "all" ? plan : undefined,
        banned: banned !== "all" ? banned : undefined,
        page,
        pageSize,
        abTest:
          abEnabled && abSubjectA && abSubjectB
            ? {
                subjects: [abSubjectA, abSubjectB],
                ratio: Math.max(1, Math.min(99, abRatio)),
              }
            : undefined,
      });
      if (res.success) {
        showSuccessToast(
          dryRun ? "Preview generated" : "Campaign started successfully"
        );
        if (dryRun) {
          // Also fetch HTML preview for sidebar
          await handlePreviewHtml();
        }
        // Refresh campaign history if it's open
        if (showCampaignHistory) {
          loadCampaignHistory();
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handlePreviewHtml = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (templateKey === "premiumPromo") params.args = [discountPct];
      if (templateKey === "profileCompletionReminder")
        params.args = [completionPct];
      if (templateKey === "reEngagement") params.args = [daysSinceLastLogin];
      const res = await previewMarketingEmail({
        templateKey: mode === "template" ? templateKey : undefined,
        subject: mode === "custom" ? customSubject : undefined,
        body: mode === "custom" ? customBody : undefined,
        params,
        preheader: mode === "custom" ? preheader : undefined,
      });
      if (res.success && (res.data as any)?.html) {
        setHtmlPreview((res.data as any).html);
      }
    } catch {}
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      showErrorToast(null, "Please enter a test email address");
      return;
    }

    setSendingTest(true);
    try {
      const params: Record<string, unknown> = {};
      if (templateKey === "premiumPromo") params.args = [discountPct];
      if (templateKey === "profileCompletionReminder")
        params.args = [completionPct];
      if (templateKey === "reEngagement") params.args = [daysSinceLastLogin];

      const res = await sendTestEmail("", {
        testEmail: testEmail.trim(),
        templateKey: mode === "template" ? templateKey : undefined,
        subject: mode === "custom" ? customSubject : undefined,
        body: mode === "custom" ? customBody : undefined,
        preheader: mode === "custom" ? preheader : undefined,
        params,
        abTest:
          abEnabled && abSubjectA && abSubjectB
            ? {
                subjects: [abSubjectA, abSubjectB],
                ratio: Math.max(1, Math.min(99, abRatio)),
              }
            : undefined,
      });

      if (res.success) {
        setTestEmail("");
        setShowTestSection(false);
      }
    } finally {
      setSendingTest(false);
    }
  };

  const loadCampaignHistory = async () => {
    if (showCampaignHistory && campaigns.length === 0) {
      const res = await getEmailCampaigns("", { limit: 20 });
      if (res.success && (res.data as any)?.campaigns) {
        setCampaigns((res.data as any).campaigns);
      }
    }
  };

  const validateEmailForm = () => {
    const errors: string[] = [];

    if (mode === "template" && !templateKey) {
      errors.push("Please select a template");
    }

    if (mode === "custom") {
      if (!customSubject.trim()) {
        errors.push("Please enter a subject");
      }
      if (!customBody.trim()) {
        errors.push("Please enter email body");
      }
    }

    if (!dryRun && !sendToAll && maxAudience <= 0) {
      errors.push("Please set a valid max audience or select 'Send to all'");
    }

    return errors;
  };

  const handleProcessOutbox = async () => {
    setProcessingOutbox(true);
    try {
      const res = await processOutboxBatch(10);
      if (res.success) {
        showSuccessToast("Processed email outbox batch");
      }
    } finally {
      setProcessingOutbox(false);
    }
  };

  return (
    <>
      <Head>
        <title>Marketing Email Campaign Manager</title>
      </Head>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Marketing Email Campaign Manager</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create, test, and send marketing emails to your users with advanced
            targeting and analytics.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid grid-cols-3 gap-2 rounded-lg border p-1 bg-white w-full md:w-auto">
                  <TabsTrigger className="px-3 py-1.5" value="template">
                    Templates
                  </TabsTrigger>
                  <TabsTrigger className="px-3 py-1.5" value="custom">
                    Custom
                  </TabsTrigger>
                  <TabsTrigger className="px-3 py-1.5" value="builder">
                    Builder
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4">
                  <div>
                    <label
                      htmlFor="template-select"
                      className="block text-sm font-medium mb-1"
                    >
                      Select Template
                    </label>
                    <Select value={templateKey} onValueChange={setTemplateKey}>
                      <SelectTrigger id="template-select" className="w-full">
                        <SelectValue placeholder="Choose template" />
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

                  {/* Template preview */}
                  {selectedTemplate && (
                    <div className="rounded-md border p-3 bg-gray-50 text-sm">
                      <div className="mb-1 font-medium">Template</div>
                      <div className="text-muted-foreground">
                        Key: {selectedTemplate.key} • Category:{" "}
                        {selectedTemplate.category}
                      </div>
                    </div>
                  )}

                  {/* Per-template params */}
                  {templateKey === "premiumPromo" && (
                    <div>
                      <label
                        htmlFor="discount-pct"
                        className="block text-sm mb-1"
                      >
                        Discount %
                      </label>
                      <Input
                        id="discount-pct"
                        type="number"
                        min={5}
                        max={90}
                        value={discountPct}
                        onChange={(e) =>
                          setDiscountPct(parseInt(e.target.value || "0", 10))
                        }
                      />
                    </div>
                  )}
                  {templateKey === "profileCompletionReminder" && (
                    <div>
                      <label
                        htmlFor="completion-pct"
                        className="block text-sm mb-1"
                      >
                        Completion %
                      </label>
                      <Input
                        id="completion-pct"
                        type="number"
                        min={0}
                        max={100}
                        value={completionPct}
                        onChange={(e) =>
                          setCompletionPct(parseInt(e.target.value || "0", 10))
                        }
                      />
                    </div>
                  )}
                  {templateKey === "reEngagement" && (
                    <div>
                      <label
                        htmlFor="days-since-login"
                        className="block text-sm mb-1"
                      >
                        Days since last login
                      </label>
                      <Input
                        id="days-since-login"
                        type="number"
                        min={1}
                        max={365}
                        value={daysSinceLastLogin}
                        onChange={(e) =>
                          setDaysSinceLastLogin(
                            parseInt(e.target.value || "0", 10)
                          )
                        }
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="builder" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="builder-subject"
                          className="block text-sm mb-1"
                        >
                          Subject
                        </label>
                        <Input
                          id="builder-subject"
                          value={builderSchema.subject}
                          onChange={(e) =>
                            setBuilderSchema({
                              ...builderSchema,
                              subject: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="builder-preheader"
                          className="block text-sm mb-1"
                        >
                          Preheader
                        </label>
                        <Input
                          id="builder-preheader"
                          value={builderSchema.preheader || ""}
                          onChange={(e) =>
                            setBuilderSchema({
                              ...builderSchema,
                              preheader: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            addBuilderSection({
                              type: "hero",
                              title: "Title",
                              subtitle: "Subtitle",
                            })
                          }
                        >
                          🌄 Hero
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            addBuilderSection({
                              type: "paragraph",
                              text: "Paragraph...",
                            })
                          }
                        >
                          ✍️ Paragraph
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            addBuilderSection({
                              type: "button",
                              cta: {
                                label: "Click Me",
                                url: "https://aroosi.app",
                              },
                            })
                          }
                        >
                          🔘 Button
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            addBuilderSection({
                              type: "image",
                              src: "https://aroosi.app/logo.png",
                              alt: "Image",
                            })
                          }
                        >
                          🖼️ Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addBuilderSection({ type: "divider" })}
                        >
                          ─ Divider
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            addBuilderSection({ type: "spacer", size: 16 })
                          }
                        >
                          ↕ Spacer
                        </Button>
                      </div>
                      <div className="space-y-2 p-2 rounded-md border bg-white">
                        <div className="text-sm font-medium mb-1">Layout</div>
                        {builderSchema.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="p-3 border rounded-md bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs">
                                <span className="inline-block px-2 py-0.5 rounded bg-white border mr-2 capitalize">
                                  {sec.type}
                                </span>
                                <span className="text-muted-foreground">
                                  #{idx + 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    moveBuilderSection(idx, idx - 1)
                                  }
                                  disabled={idx === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    moveBuilderSection(idx, idx + 1)
                                  }
                                  disabled={
                                    idx === builderSchema.sections.length - 1
                                  }
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeBuilderSection(idx)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            {sec.type === "hero" && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Title"
                                  value={sec.title}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      title: e.target.value,
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Subtitle"
                                  value={sec.subtitle || ""}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      subtitle: e.target.value,
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Image URL"
                                  value={sec.imageUrl || ""}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      imageUrl: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            )}
                            {sec.type === "paragraph" && (
                              <Textarea
                                rows={4}
                                value={sec.text}
                                onChange={(e) =>
                                  updateBuilderSection(idx, {
                                    ...sec,
                                    text: e.target.value,
                                  })
                                }
                              />
                            )}
                            {sec.type === "button" && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Label"
                                  value={sec.cta.label}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      cta: {
                                        ...sec.cta,
                                        label: e.target.value,
                                      },
                                    })
                                  }
                                />
                                <Input
                                  placeholder="URL"
                                  value={sec.cta.url}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      cta: { ...sec.cta, url: e.target.value },
                                    })
                                  }
                                />
                              </div>
                            )}
                            {sec.type === "image" && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Image URL"
                                  value={sec.src}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      src: e.target.value,
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Alt text"
                                  value={sec.alt || ""}
                                  onChange={(e) =>
                                    updateBuilderSection(idx, {
                                      ...sec,
                                      alt: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            )}
                            {sec.type === "spacer" && (
                              <Input
                                type="number"
                                placeholder="Size"
                                value={(sec.size || 16).toString()}
                                onChange={(e) =>
                                  updateBuilderSection(idx, {
                                    ...sec,
                                    size: parseInt(e.target.value || "16", 10),
                                  })
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Builder Preview
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mb-2"
                        onClick={async () => {
                          const res = await previewMarketingEmail({
                            templateKey: "builder",
                            params: {
                              schema: builderSchema,
                            } as unknown as Record<string, unknown>,
                            preheader: builderSchema.preheader || undefined,
                          });
                          // preview endpoint for builder expects schema in params in our API; ignore type here for runtime check
                          if (res.success && (res.data as any)?.html)
                            setHtmlPreview((res.data as any).html);
                        }}
                      >
                        Render
                      </Button>
                      {htmlPreview ? (
                        <iframe
                          title="builder-html-preview"
                          className="w-full h-[480px] bg-white rounded border"
                          sandbox="allow-same-origin"
                          srcDoc={htmlPreview}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Use Render to see the builder output.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <label
                      htmlFor="custom-subject"
                      className="block text-sm mb-1"
                    >
                      Subject
                    </label>
                    <Input
                      id="custom-subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Your subject line"
                    />
                  </div>
                  <div>
                    <label htmlFor="preheader" className="block text-sm mb-1">
                      Preheader
                    </label>
                    <Input
                      id="preheader"
                      value={preheader}
                      onChange={(e) => setPreheader(e.target.value)}
                      placeholder="Short preview text shown in inbox"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useEditor}
                      onChange={(e) => setUseEditor(e.target.checked)}
                    />
                    Use WYSIWYG editor
                  </label>
                  <div>
                    <label htmlFor="custom-body" className="block text-sm mb-1">
                      HTML Body
                    </label>
                    {useEditor ? (
                      <Textarea
                        id="custom-body"
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        rows={10}
                        placeholder="Write or paste HTML (WYSIWYG integration placeholder)"
                      />
                    ) : (
                      <Textarea
                        id="custom-body"
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        rows={10}
                        placeholder="Raw HTML content"
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dry-run"
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      id="dry-run"
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                    />
                    Dry run (no emails sent)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {dryRun
                      ? "Preview mode - shows what would be sent"
                      : "Live mode - emails will be sent to users"}
                  </p>
                </div>
                <div>
                  <label htmlFor="max-audience" className="block text-sm mb-1">
                    Max audience
                  </label>
                  <Input
                    id="max-audience"
                    type="number"
                    min={1}
                    max={10000}
                    value={maxAudience}
                    onChange={(e) =>
                      setMaxAudience(parseInt(e.target.value || "0", 10))
                    }
                    disabled={sendToAll}
                  />
                </div>
                {/* Audience filters */}
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="search" className="block text-sm mb-1">
                      Search (name/email)
                    </label>
                    <Input
                      id="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="e.g. john or john@..."
                    />
                  </div>
                  <div>
                    <label htmlFor="plan" className="block text-sm mb-1">
                      Plan
                    </label>
                    <Select
                      value={plan}
                      onValueChange={setPlan}
                      disabled={sendToAllFromAuth}
                    >
                      <SelectTrigger
                        id="plan"
                        className="w-full"
                        disabled={sendToAllFromAuth}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="premiumPlus">
                          Premium Plus
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="banned" className="block text-sm mb-1">
                      Banned status
                    </label>
                    <Select
                      value={banned}
                      onValueChange={setBanned}
                      disabled={sendToAllFromAuth}
                    >
                      <SelectTrigger
                        id="banned"
                        className="w-full"
                        disabled={sendToAllFromAuth}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Banned</SelectItem>
                        <SelectItem value="false">Not banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Paging */}
                <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="page" className="block text-sm mb-1">
                      Page
                    </label>
                    <Input
                      id="page"
                      type="number"
                      min={1}
                      value={page}
                      onChange={(e) =>
                        setPage(parseInt(e.target.value || "1", 10))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="pageSize" className="block text-sm mb-1">
                      Page size
                    </label>
                    <Input
                      id="pageSize"
                      type="number"
                      min={10}
                      max={5000}
                      value={pageSize}
                      onChange={(e) =>
                        setPageSize(parseInt(e.target.value || "500", 10))
                      }
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                    />
                    Send to all users (ignores Max audience)
                  </label>
                  {sendToAll && (
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendToAllFromAuth}
                        onChange={(e) => setSendToAllFromAuth(e.target.checked)}
                      />
                      Populate from Auth registry (bypasses Firestore filters)
                    </label>
                  )}
                  {sendToAll && sendToAllFromAuth && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      Using Auth users list. Plan/Banned filters are disabled;
                      search by email still applies.
                    </div>
                  )}
                  {!dryRun && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      ⚠️ Live mode: Emails will be sent to real users. Consider
                      testing first.
                    </div>
                  )}
                </div>
                <div className="col-span-2 border-t pt-3">
                  <label className="flex items-center gap-2 text-sm mb-2">
                    <input
                      type="checkbox"
                      checked={abEnabled}
                      onChange={(e) => setAbEnabled(e.target.checked)}
                    />
                    Enable A/B subject testing
                  </label>
                  {abEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="ab-a" className="block text-sm mb-1">
                          Subject A
                        </label>
                        <Input
                          id="ab-a"
                          value={abSubjectA}
                          onChange={(e) => setAbSubjectA(e.target.value)}
                          placeholder="Variant A subject"
                        />
                      </div>
                      <div>
                        <label htmlFor="ab-b" className="block text-sm mb-1">
                          Subject B
                        </label>
                        <Input
                          id="ab-b"
                          value={abSubjectB}
                          onChange={(e) => setAbSubjectB(e.target.value)}
                          placeholder="Variant B subject"
                        />
                      </div>
                      <div className="col-span-2">
                        <label
                          htmlFor="ab-ratio"
                          className="block text-sm mb-1"
                        >
                          Split ratio (A%)
                        </label>
                        <Input
                          id="ab-ratio"
                          type="number"
                          min={1}
                          max={99}
                          value={abRatio}
                          onChange={(e) =>
                            setAbRatio(parseInt(e.target.value || "50", 10))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Email Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Test Email</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTestSection(!showTestSection)}
                  >
                    {showTestSection ? "Hide" : "Show"} Test Options
                  </Button>
                </div>

                {showTestSection && (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Send a test email to verify your content before sending to
                      your audience.
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSendTestEmail}
                        disabled={sendingTest || !testEmail.trim()}
                        variant="outline"
                      >
                        {sendingTest ? "Sending..." : "Send Test Email"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Campaign History Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Campaign History</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCampaignHistory(!showCampaignHistory);
                      if (!showCampaignHistory) {
                        loadCampaignHistory();
                      }
                    }}
                  >
                    {showCampaignHistory ? "Hide" : "Show"} History
                  </Button>
                </div>

                {showCampaignHistory && (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    {campaigns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No campaigns found.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {campaigns.map((campaign) => (
                          <div
                            key={campaign.id}
                            className="flex items-center justify-between p-3 bg-white rounded border text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {campaign.templateKey ||
                                  campaign.subject ||
                                  "Custom Campaign"}
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(
                                  campaign.createdAt
                                ).toLocaleDateString()}{" "}
                                •{campaign.totalSent} emails sent
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  campaign.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : campaign.status === "processing"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {campaign.status}
                              </span>
                              <a
                                className="px-2 py-1 rounded border text-xs"
                                href={`/admin/marketing-email/campaign/${campaign.id}`}
                              >
                                View
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSend} disabled={sending}>
                  {sending
                    ? dryRun
                      ? "Generating preview..."
                      : "Sending campaign..."
                    : dryRun
                      ? "Generate Preview"
                      : sendToAll || sendToAllFromAuth
                        ? `Send to All Users (${maxAudience} max per batch)`
                        : `Send to ${maxAudience} Users`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePreviewHtml}
                  disabled={sending}
                >
                  Preview HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={handleProcessOutbox}
                  disabled={processingOutbox}
                  title="Process a small batch of queued emails"
                >
                  {processingOutbox ? "Processing…" : "Process Outbox"}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-3">
                <div className="border rounded-md p-3">
                  <div className="text-sm font-medium mb-2">Summary</div>
                  <div className="text-xs text-muted-foreground">Mode</div>
                  <div className="text-sm mb-2">
                    {mode === "template" ? "Template" : "Custom"}
                  </div>
                  <div className="text-xs text-muted-foreground">Template</div>
                  <div className="text-sm mb-2">
                    {selectedTemplate?.label || "(none)"}
                  </div>
                  <div className="text-xs text-muted-foreground">Audience</div>
                  <div className="text-sm">
                    {sendToAll ? "All users" : `Max ${maxAudience}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Dry run
                  </div>
                  <div className="text-sm">{dryRun ? "Yes" : "No"}</div>
                  {abEnabled && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground">
                        A/B Subjects
                      </div>
                      <div className="text-sm break-words">A: {abSubjectA}</div>
                      <div className="text-sm break-words">B: {abSubjectB}</div>
                      <div className="text-xs text-muted-foreground">Split</div>
                      <div className="text-sm">{abRatio}%</div>
                    </div>
                  )}
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm font-medium mb-2">Live Preview</div>
                  {htmlPreview ? (
                    <iframe
                      title="email-html-preview"
                      className="w-full h-[480px] bg-white rounded border"
                      sandbox="allow-same-origin"
                      srcDoc={htmlPreview}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Generate a preview or send a test to see HTML here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
