"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/push-notification/devices?${params.toString()}`);
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const testSend = async (playerId: string) => {
    try {
      const res = await fetch("/api/admin/push-notification/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, title: "Test", message: "Test notification" }),
      });
      if (!res.ok) throw new Error("Failed");
      // A simple optimistic hint
+      // NOTE: toast could be used here if your UI lib is available
      console.log("Queued test notification for", playerId);
    } catch (e) {
      console.error("test send failed", e);
    }
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registered Push Devices</CardTitle>
          <Badge variant="secondary">OneSignal</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by email, playerId, deviceType"
          />
          <Button onClick={() => { setPage(1); fetchDevices(); }} disabled={loading}>Search</Button>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Player ID</th>
                <th className="text-left p-2">Device</th>
                <th className="text-left p-2">Registered</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.playerId} className="border-t">
                  <td className="p-2">{r.email || "—"}</td>
                  <td className="p-2">
                    <code className="text-[11px] break-all">{r.playerId}</code>
                  </td>
                  <td className="p-2">{r.deviceType || "web"}</td>
                  <td className="p-2">{r.registeredAt ? new Date(r.registeredAt).toLocaleString() : "—"}</td>
                  <td className="p-2">{r.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" onClick={() => testSend(r.playerId)}>Test</Button>
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
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <div className="text-sm">
              Page {page} / {totalPages}
            </div>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
