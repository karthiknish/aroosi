"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TemplateInfo = { key: string; label: string; category?: string; argsDoc?: string };

export default function TemplatesCatalogPage() {
  const [items, setItems] = useState<TemplateInfo[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/email/templates/registry");
        const data = await res.json();
        if (res.ok && data?.data?.templates) setItems(data.data.templates);
      } catch {}
    })();
  }, []);

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Registered Templates</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No templates found.</div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.key} className="p-3 rounded border flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.key} • {t.category || 'general'}</div>
                  {t.argsDoc && (
                    <div className="text-xs text-muted-foreground mt-1">{t.argsDoc}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm underline"
                    onClick={async () => {
                      try {
                        const payload: any = { templateKey: t.key };
                        // provide minimal default args where possible
                        if (t.key === 'premiumPromo') payload.params = { args: [20] };
                        if (t.key === 'profileCompletionReminder') payload.params = { args: [70] };
                        if (t.key === 'reEngagement') payload.params = { args: [14] };
                        const res = await fetch('/api/admin/marketing-email/preview', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json();
                        if (res.ok && data?.data?.html) setPreviewHtml(data.data.html);
                      } catch {}
                    }}
                  >Preview</button>
                  <a className="text-sm underline" href={`/admin/marketing-email?template=${encodeURIComponent(t.key)}`}>Use</a>
                </div>
              </div>
            ))}
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Live Preview</div>
              {previewHtml ? (
                <iframe
                  title="template-preview"
                  className="w-full h-[600px] bg-white rounded border"
                  sandbox="allow-same-origin"
                  srcDoc={previewHtml}
                />
              ) : (
                <div className="text-sm text-muted-foreground">Select Preview to render a template.</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


