"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

type Report = {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: number;
};

export default function AdminReportsPage() {
  const { isLoaded, isAdmin } = useAuthContext();
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed" | "resolved">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const data = (json?.data?.reports ?? json?.reports ?? []) as Report[];
      setReports(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isAdmin) void fetchReports();
  }, [isLoaded, isAdmin, statusFilter]);

  const updateReport = async (id: string, body: { status: Report["status"]; banUser?: boolean }) => {
    try {
      const res = await fetch(`/api/admin/reports`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!isLoaded) return <Skeleton className="h-48 w-full" />;
  if (!isAdmin)
    return (
      <ErrorState message="You must be an admin to view this page." className="min-h-[60vh]" />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          <Button variant="outline" onClick={fetchReports}>Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : reports.length === 0 ? (
        <div className="text-sm text-neutral-500">No reports.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Report #{r.id.slice(0, 8)}</span>
                  <Badge variant={r.status === "pending" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-col gap-1">
                  <div><span className="text-neutral-500">Reporter:</span> {r.reporterUserId}</div>
                  <div><span className="text-neutral-500">Reported:</span> {r.reportedUserId}</div>
                  <div><span className="text-neutral-500">Reason:</span> {r.reason}</div>
                  {r.description && (
                    <div className="whitespace-pre-wrap">
                      <span className="text-neutral-500">Description:</span> {r.description}
                    </div>
                  )}
                  <div className="text-neutral-500">Created: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  {r.status !== "reviewed" && (
                    <Button variant="outline" size="sm" onClick={() => updateReport(r.id, { status: "reviewed" })}>
                      Mark Reviewed
                    </Button>
                  )}
                  {r.status !== "resolved" && (
                    <Button variant="outline" size="sm" onClick={() => updateReport(r.id, { status: "resolved" })}>
                      Resolve
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateReport(r.id, { status: "reviewed", banUser: true })}
                    title="Ban reported user"
                  >
                    Ban user
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


