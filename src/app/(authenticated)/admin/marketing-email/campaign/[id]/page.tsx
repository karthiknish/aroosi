"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Summary = {
  campaign: any;
  totals: { total: number; queued: number; sending: number; retry: number; sent: number; error: number; opens?: number; clicks?: number };
  byHour: Record<string, number>;
  trackingByHour?: { opens: Record<string, number>; clicks: Record<string, number> };
};

export default function CampaignDetailsPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<string>("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugJson, setDebugJson] = useState<any | null>(null);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      if (reset) {
        setCursor(undefined);
        setEmails([]);
      }
      const s = await fetch(`/api/admin/marketing-email/campaigns/${id}/summary`).then((r) => r.json());
      if (s?.data) setSummary(s.data as Summary);
      const q = new URLSearchParams();
      q.set("limit", "50");
      if (cursor && !reset) q.set("after", cursor);
      if (filter) q.set("status", filter);
      const e = await fetch(`/api/admin/marketing-email/campaigns/${id}/emails?${q.toString()}`).then((r) => r.json());
      if (e?.data?.items) setEmails((prev) => (reset ? e.data.items : prev.concat(e.data.items)));
      if (e?.data?.nextCursor) setCursor(e.data.nextCursor);
      else setCursor(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filter]);

  const kpis = useMemo(() => {
    const t = summary?.totals;
    if (!t) return [];
    return [
      { label: "Total", value: t.total },
      { label: "Sent", value: t.sent },
      { label: "Retry", value: t.retry },
      { label: "Error", value: t.error },
      { label: "Queued", value: t.queued },
      { label: "Sending", value: t.sending },
      { label: "Opens", value: t.opens ?? 0 },
      { label: "Clicks", value: t.clicks ?? 0 },
    ];
  }, [summary]);

  return (
    <>
      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <div className="text-sm text-muted-foreground">ID: {id}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="p-3 rounded border bg-white">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Opens/Clicks timeline (tiny bars) */}
          {summary?.trackingByHour && (
            <div className="space-y-2">
              {(["opens", "clicks"] as const).map((kind) => {
                const map = summary.trackingByHour?.[kind] || {};
                const entries = Object.entries(map).sort((a, b) =>
                  a[0] < b[0] ? -1 : 1
                );
                const maxVal = Math.max(
                  1,
                  ...entries.map(([, v]) => v as number)
                );
                return (
                  <div key={kind}>
                    <div className="text-xs mb-1 capitalize">{kind}</div>
                    <div className="flex items-end gap-1 h-12">
                      {entries.map(([k, v]) => (
                        <div
                          key={k}
                          title={`${k}: ${v}`}
                          className="bg-blue-500"
                          style={{
                            width: 4,
                            height: Math.max(
                              2,
                              Math.round((Number(v) / maxVal) * 48)
                            ),
                          }}
                        />
                      ))}
                      {entries.length === 0 && (
                        <div className="text-xs text-muted-foreground">
                          No {kind} yet
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm" htmlFor="filter-select">
              Filter
            </label>
            <select
              id="filter-select"
              className="border rounded px-2 py-1 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="sent">Sent</option>
              <option value="retry">Retry</option>
              <option value="error">Error</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {/* Emails table */}
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Subject</th>
                  <th className="text-left p-2">Attempts</th>
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Debug</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">
                      {it.createdAt
                        ? new Date(it.createdAt).toLocaleString()
                        : ""}
                    </td>
                    <td className="p-2">
                      {Array.isArray(it.to) ? it.to.join(", ") : it.to}
                    </td>
                    <td className="p-2">{it.status}</td>
                    <td className="p-2">{it.subject}</td>
                    <td className="p-2">{it.attempts ?? 0}</td>
                    <td className="p-2">{it.providerResponseId || ""}</td>
                    <td className="p-2">
                      {it.providerResponse ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDebugJson(it.providerResponse);
                            setDebugOpen(true);
                          }}
                        >
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {emails.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={7}>
                      No emails found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(false)}
              disabled={loading || !cursor}
            >
              {loading ? "Loading…" : cursor ? "Load More" : "No More"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Provider Response</DialogTitle>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-[60vh] overflow-auto bg-gray-50 p-3 rounded border">
            {debugJson ? JSON.stringify(debugJson, null, 2) : "No data"}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
