"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  sendMarketingEmail,
  listEmailTemplates,
  previewMarketingEmail,
  sendTestEmail,
  getEmailCampaigns,
} from "@/lib/marketingEmailApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { CampaignForm } from "./components/CampaignForm";
import { AudienceFilters } from "./components/AudienceFilters";
import { TestEmailSection } from "./components/TestEmailSection";
import { CampaignHistory } from "./components/CampaignHistory";
import { CampaignActions } from "./components/CampaignActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";

type TemplateItem = { key: string; label: string; category: string };

export default function MarketingEmailAdminPage() {
  // Cookie-auth; remove token from context and API
  useAuthContext(); // keep hook for gating if needed
  const searchParams = useSearchParams();
  const initFromQuery = useRef(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateKey, setTemplateKey] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [maxAudience, setMaxAudience] = useState<number>(500);
  const [sendToAll, setSendToAll] = useState<boolean>(false);
  const [mode, setMode] = useState<"template" | "custom">("template");
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
  
  // Advanced filters
  const [lastActiveDays, setLastActiveDays] = useState<number>(NaN as any);
  const [createdAtFrom, setCreatedAtFrom] = useState<string>("");
  const [createdAtTo, setCreatedAtTo] = useState<string>("");
  const [completionMin, setCompletionMin] = useState<number>(NaN as any);
  const [completionMax, setCompletionMax] = useState<number>(NaN as any);
  const [city, setCity] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  
  // Test email functionality
  const [testEmail, setTestEmail] = useState<string>("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showTestSection, setShowTestSection] = useState<boolean>(false);
  
  // Campaign history
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignHistory, setShowCampaignHistory] = useState<boolean>(false);
  const [processingOutbox, setProcessingOutbox] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await listEmailTemplates();
      if (res.success && (res.data as any)?.templates) {
        const t = (res.data as any).templates as TemplateItem[];
        setTemplates(t);
        // If no template selected yet and no query override, default to first
        if (!templateKey && !initFromQuery.current && t.length > 0) {
          setTemplateKey(t[0].key);
        }
        // If current selection is invalid (e.g., query param was unknown), snap to first template
        if (
          templateKey &&
          !t.find((tpl) => tpl.key === templateKey) &&
          t.length > 0
        ) {
          setTemplateKey(t[0].key);
        }
      }
    })();
  }, []);

  // Preselect template from query string (?template=key) once on mount
  useEffect(() => {
    if (initFromQuery.current) return;
    const q = searchParams?.get("template");
    if (q && typeof q === "string") {
      setTemplateKey(q);
      // ensure we're on template mode when coming from catalog "Use"
      setMode("template");
    }
    initFromQuery.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        preheader: mode === "custom" ? preheader : undefined,
        search: search || undefined,
        plan: plan !== "all" ? plan : undefined,
        banned: banned !== "all" ? banned : undefined,
        // pass advanced filters
        lastActiveDays: Number.isFinite(lastActiveDays)
          ? Number(lastActiveDays)
          : undefined,
        createdAtFrom: createdAtFrom ? Date.parse(createdAtFrom) : undefined,
        createdAtTo: createdAtTo ? Date.parse(createdAtTo) : undefined,
        completionMin: Number.isFinite(completionMin)
          ? Number(completionMin)
          : undefined,
        completionMax: Number.isFinite(completionMax)
          ? Number(completionMax)
          : undefined,
        city: city || undefined,
        country: country || undefined,
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
        showSuccessToast("Preview updated");
      }
    } catch {
      showErrorToast(null, "Failed to generate preview");
    }
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
        showSuccessToast(`Test email sent to ${testEmail}`);
        setTestEmail("");
        setShowTestSection(false);
      }
    } finally {
      setSendingTest(false);
    }
  };

  const loadCampaignHistory = async () => {
    if (campaigns.length === 0) {
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
      const res = await fetch("/api/admin/email/outbox/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccessToast("Processed email outbox batch");
    } catch (e) {
      showErrorToast(null, "Failed to process outbox");
    } finally {
      setProcessingOutbox(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (templateKey === "premiumPromo") params.args = [discountPct];
      if (templateKey === "profileCompletionReminder")
        params.args = [completionPct];
      if (templateKey === "reEngagement")
        params.args = [daysSinceLastLogin];
      const res = await fetch("/api/admin/marketing-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: mode === "template" ? templateKey : undefined,
          subject: mode === "custom" ? customSubject : undefined,
          body: mode === "custom" ? customBody : undefined,
          params,
          dryRun: true,
          exportCsv: true,
          maxAudience,
          search: search || undefined,
          plan: plan !== "all" ? plan : undefined,
          banned: banned !== "all" ? banned : undefined,
          lastActiveDays: Number.isFinite(lastActiveDays)
            ? Number(lastActiveDays)
            : undefined,
          createdAtFrom: createdAtFrom
            ? Date.parse(createdAtFrom)
            : undefined,
          createdAtTo: createdAtTo
            ? Date.parse(createdAtTo)
            : undefined,
          completionMin: Number.isFinite(completionMin)
            ? Number(completionMin)
            : undefined,
          completionMax: Number.isFinite(completionMax)
            ? Number(completionMax)
            : undefined,
          city: city || undefined,
          country: country || undefined,
          page,
          pageSize,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = new Blob([text], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audience.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      showErrorToast(null, "Failed to export CSV");
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Email Manager</h1>
        <p className="text-gray-500">Create, target, and send email campaigns to your user base.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <CampaignForm
            mode={mode}
            setMode={setMode}
            templates={templates}
            templateKey={templateKey}
            setTemplateKey={setTemplateKey}
            discountPct={discountPct}
            setDiscountPct={setDiscountPct}
            daysSinceLastLogin={daysSinceLastLogin}
            setDaysSinceLastLogin={setDaysSinceLastLogin}
            completionPct={completionPct}
            setCompletionPct={setCompletionPct}
            customSubject={customSubject}
            setCustomSubject={setCustomSubject}
            customBody={customBody}
            setCustomBody={setCustomBody}
            preheader={preheader}
            setPreheader={setPreheader}
            useEditor={useEditor}
            setUseEditor={setUseEditor}
            abEnabled={abEnabled}
            setAbEnabled={setAbEnabled}
            abSubjectA={abSubjectA}
            setAbSubjectA={setAbSubjectA}
            abSubjectB={abSubjectB}
            setAbSubjectB={setAbSubjectB}
            abRatio={abRatio}
            setAbRatio={setAbRatio}
          />

          <AudienceFilters
            search={search}
            setSearch={setSearch}
            plan={plan}
            setPlan={setPlan}
            banned={banned}
            setBanned={setBanned}
            city={city}
            setCity={setCity}
            country={country}
            setCountry={setCountry}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            lastActiveDays={lastActiveDays}
            setLastActiveDays={setLastActiveDays}
            createdAtFrom={createdAtFrom}
            setCreatedAtFrom={setCreatedAtFrom}
            createdAtTo={createdAtTo}
            setCreatedAtTo={setCreatedAtTo}
            completionMin={completionMin}
            setCompletionMin={setCompletionMin}
            completionMax={completionMax}
            setCompletionMax={setCompletionMax}
            maxAudience={maxAudience}
            setMaxAudience={setMaxAudience}
            sendToAll={sendToAll}
            setSendToAll={setSendToAll}
            dryRun={dryRun}
          />
        </div>

        {/* Right Column: Preview & History */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="sticky top-6 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-slate-500" />
                  Live Preview
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePreviewHtml}
                  className="h-8 text-xs text-slate-500 hover:text-slate-900"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-slate-100 min-h-[500px] flex flex-col relative">
                {htmlPreview ? (
                  <iframe
                    title="email-html-preview"
                    className="w-full flex-1 bg-white"
                    sandbox="allow-same-origin"
                    srcDoc={htmlPreview}
                  />
                ) : mode === "custom" && customBody ? (
                  <div className="p-6 bg-white h-full overflow-auto">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: customBody,
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-slate-400">
                    <Eye className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium text-slate-600">No preview available</p>
                    <p className="text-xs mt-1 max-w-[200px]">
                      Select a template or start typing in the custom editor to see a preview.
                    </p>
                    <Button variant="outline" size="sm" onClick={handlePreviewHtml} className="mt-4">
                      Generate Preview
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <TestEmailSection
            testEmail={testEmail}
            setTestEmail={setTestEmail}
            sendingTest={sendingTest}
            onSendTest={handleSendTestEmail}
            showTestSection={showTestSection}
            setShowTestSection={setShowTestSection}
          />

          <CampaignHistory
            campaigns={campaigns}
            showCampaignHistory={showCampaignHistory}
            setShowCampaignHistory={setShowCampaignHistory}
            loadCampaignHistory={loadCampaignHistory}
          />
        </div>
      </div>

      <CampaignActions
        sending={sending}
        dryRun={dryRun}
        setDryRun={setDryRun}
        sendToAll={sendToAll}
        maxAudience={maxAudience}
        onSend={handleSend}
        onPreviewHtml={handlePreviewHtml}
        onExportCsv={handleExportCsv}
        processingOutbox={processingOutbox}
        onProcessOutbox={handleProcessOutbox}
      />
    </div>
  );
}
