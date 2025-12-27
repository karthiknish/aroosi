"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminEmailAPI } from "@/lib/api/admin/email";

type Summary = {
  campaign: any;
  totals: {
    total: number;
    queued: number;
    sending: number;
    retry: number;
    sent: number;
    error: number;
    opens?: number;
    clicks?: number;
    unsubscribes?: number;
    skippedUnsubscribed?: number;
  };
  byHour: Record<string, number>;
  trackingByHour?: {
    opens: Record<string, number>;
    clicks: Record<string, number>;
    unsubscribes?: Record<string, number>;
  };
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
  const [priority, setPriority] = useState<string>("normal");
  const [listId, setListId] = useState<string>("");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    []
  );
  const [status, setStatus] = useState<string>("active");
  const [maxAttempts, setMaxAttempts] = useState<number>(5);
  const [batchSize, setBatchSize] = useState<number>(50);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      if (reset) {
        setCursor(undefined);
        setEmails([]);
      }
      const s = await adminEmailAPI.getCampaignSummary(id);
      if (s) setSummary(s as Summary);
      
      const e = await adminEmailAPI.getCampaignEmails(id, {
        limit: 50,
        after: cursor && !reset ? cursor : undefined,
        status: filter || undefined,
      });
      
      if (e?.items)
        setEmails((prev) => (reset ? e.items : prev.concat(e.items)));
      if (e?.nextCursor) setCursor(e.nextCursor);
      else setCursor(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filter]);

  useEffect(() => {
    if (summary?.campaign?.settings) {
      setPriority(summary.campaign.settings.priority || "normal");
      setListId(summary.campaign.settings.listId || "");
      const h = summary.campaign.settings.headers || {};
      setHeaders(Object.keys(h).map((k) => ({ key: k, value: String(h[k]) })));
      if ((summary as any)?.campaign?.status)
        setStatus((summary as any).campaign.status);
      if ((summary as any)?.campaign?.settings?.maxAttempts)
        setMaxAttempts((summary as any).campaign.settings.maxAttempts);
      if ((summary as any)?.campaign?.settings?.batchSize)
        setBatchSize((summary as any).campaign.settings.batchSize);
    }
  }, [summary?.campaign?.settings]);

  const kpis = useMemo(() => {
    const t = summary?.totals;
    if (!t) return [];
    const items = [
      { label: "Total", value: t.total },
      { label: "Sent", value: t.sent },
      { label: "Retry", value: t.retry },
      { label: "Error", value: t.error },
      { label: "Queued", value: t.queued },
      { label: "Sending", value: t.sending },
      { label: "Opens", value: t.opens ?? 0 },
      { label: "Clicks", value: t.clicks ?? 0 },
    ];
    // Append Unsubs and Skipped (with tooltip)
    items.push({ label: "Unsubs", value: t.unsubscribes ?? 0 });
    items.push({
      label: "Skipped (unsubs)",
      value: t.skippedUnsubscribed ?? 0,
    });
    return items;
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
              <div
                key={k.label}
                className="p-3 rounded border bg-white"
                title={
                  k.label === "Skipped (unsubs)"
                    ? "Emails not sent because the recipient had previously unsubscribed (global or marketing category)."
                    : undefined
                }
              >
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Opens/Clicks timeline (tiny bars) */}
          {summary?.trackingByHour && (
            <div className="space-y-2">
              {(["opens", "clicks", "unsubscribes"] as const).map((kind) => {
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
                          className={
                            kind === "unsubscribes"
                              ? "bg-red-500"
                              : kind === "clicks"
                                ? "bg-green-500"
                                : "bg-blue-500"
                          }
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

          {/* Campaign Settings */}
          <div className="rounded border p-3 space-y-2">
            <div className="text-sm font-medium">Campaign Settings</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm" htmlFor="priority-select">
                Priority
              </label>
              <select
                id="priority-select"
                className="border rounded px-2 py-1 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <label className="text-sm" htmlFor="listid-input">
                List-Id
              </label>
              <input
                id="listid-input"
                className="border rounded px-2 py-1 text-sm"
                placeholder="e.g. marketing.aroosi.app"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
              />
              <label className="text-sm" htmlFor="status-select">
                Status
              </label>
              <select
                id="status-select"
                className="border rounded px-2 py-1 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <label className="text-sm" htmlFor="maxAttempts">
                Max Attempts
              </label>
              <input
                id="maxAttempts"
                type="number"
                className="border rounded px-2 py-1 text-sm w-20"
                value={maxAttempts}
                onChange={(e) =>
                  setMaxAttempts(parseInt(e.target.value || "5", 10))
                }
              />
              <label className="text-sm" htmlFor="batchSize">
                Batch Size
              </label>
              <input
                id="batchSize"
                type="number"
                className="border rounded px-2 py-1 text-sm w-20"
                value={batchSize}
                onChange={(e) =>
                  setBatchSize(parseInt(e.target.value || "50", 10))
                }
              />
              <Button
                size="sm"
                onClick={async () => {
                  await adminEmailAPI.updateCampaignSettings(id, {
                    priority,
                    listId,
                    status,
                    maxAttempts,
                    batchSize,
                    headers: headers
                      .filter((row) => row.key.trim())
                      .reduce((acc: Record<string, string>, row) => {
                        acc[row.key.trim()] = row.value;
                        return acc;
                      }, {}),
                  });
                  await load(true);
                }}
              >
                Save
              </Button>
            </div>
            <div>
              <div className="text-sm font-medium mt-2 mb-1">Headers</div>
              <div className="space-y-2">
                {headers.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="border rounded px-2 py-1 text-sm w-48"
                      placeholder="Header-Name"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...headers];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setHeaders(next);
                      }}
                    />
                    <input
                      className="border rounded px-2 py-1 text-sm flex-1"
                      placeholder="Header value"
                      value={row.value}
                      onChange={(e) => {
                        const next = [...headers];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setHeaders(next);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = headers.filter((_, i) => i !== idx);
                        setHeaders(next);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setHeaders([...headers, { key: "", value: "" }])
                  }
                >
                  Add Header
                </Button>
              </div>
            </div>
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
