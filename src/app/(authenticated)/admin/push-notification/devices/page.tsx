"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  listEmailTemplates,
  sendMarketingEmail,
} from "@/lib/marketingEmailApi";

interface DeviceRow {
  userId: string;
  email?: string;
  playerId: string;
  deviceType?: string;
  deviceToken?: string;
  registeredAt?: number;
  isActive?: boolean;
}

export default function AdminDevicesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [templates, setTemplates] = useState<
    Array<{ key: string; label: string; category: string }>
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const fetchDevices = async (override?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const s = override?.search ?? search;
      const p = override?.page ?? page;
      const ps = override?.pageSize ?? pageSize;
      if (s.trim()) params.set("search", s.trim());
      params.set("page", String(p));
      params.set("pageSize", String(ps));
      const res = await fetch(
        `/api/admin/push-notification/devices?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRows(data?.data?.items ?? []);
      setTotal(data?.data?.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    (async () => {
      const res = await listEmailTemplates();
      if (res.success && (res as any).data?.templates) {
        const t = (res as any).data.templates as Array<{
          key: string;
          label: string;
          category: string;
        }>;
        setTemplates(t);
        if (t[0]) setSelectedTemplate(t[0].key);
      }
    })();
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const testEmail = async (email: string) => {
    try {
      if (!selectedTemplate) throw new Error("Select a template first");
      const res = await sendMarketingEmail("", {
        templateKey: selectedTemplate,
        dryRun: true,
        confirm: false,
        maxAudience: 1,
        params: {},
      });
      if (!res.success) throw new Error(res.error || "Failed");
      showSuccessToast("Email preview queued (dry run)");
    } catch (e) {
      console.error("test email failed", e);
      showErrorToast(null, "Failed to preview email");
    }
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Emails & Templates</CardTitle>
          <Badge variant="secondary">Resend</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by email"
          />
          <Button
            onClick={() => {
              setPage(1);
              fetchDevices();
            }}
            disabled={loading}
          >
            Search
          </Button>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            title="Choose template"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.category === "marketing" ? "📰" : "✉️"} {t.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            {templates.length} templates
          </span>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Send Test</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Registered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email || r.userId} className="border-t">
                  <td className="p-2">
                    {r.email ? (
                      <button
                        type="button"
                        className="underline underline-offset-2 text-pink-600 hover:text-pink-700"
                        onClick={() => {
                          setSearch(r.email!);
                          setPage(1);
                          fetchDevices({ search: r.email!, page: 1 });
                        }}
                        title={`Filter by ${r.email}`}
                      >
                        {r.email}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    {r.email ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testEmail(r.email!)}
                        disabled={!selectedTemplate}
                      >
                        Preview Email
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No email
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {r.isActive ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </td>
                  <td className="p-2">
                    {r.registeredAt
                      ? new Date(r.registeredAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={6}>
                    {loading ? "Loading..." : "No devices found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Total: {total}</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <div className="text-sm">
              Page {page} / {totalPages}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
