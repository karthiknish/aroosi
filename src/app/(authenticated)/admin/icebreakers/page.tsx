"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type IceQ = { id: string; text: string; active: boolean; category?: string | null; weight?: number | null; createdAt: number };

async function listIcebreakers(): Promise<IceQ[]> {
  const res = await fetch("/api/admin/icebreakers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch questions");
  const json = await res.json();
  return (json?.data?.items as IceQ[]) ?? [];
}

async function createIcebreaker(payload: { text: string; category?: string; active?: boolean; weight?: number }) {
  const res = await fetch("/api/admin/icebreakers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateIcebreaker(payload: { id: string; text?: string; category?: string; active?: boolean; weight?: number }) {
  const res = await fetch("/api/admin/icebreakers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function deleteIcebreaker(id: string) {
  const res = await fetch("/api/admin/icebreakers", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

export default function AdminIcebreakersPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin","icebreakers"], queryFn: listIcebreakers });
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newWeight, setNewWeight] = useState<number | "">("");

  const mCreate = useMutation({
    mutationFn: createIcebreaker,
    onSuccess: () => { toast.success("Created"); void qc.invalidateQueries({ queryKey: ["admin","icebreakers"] }); setNewText(""); setNewCategory(""); setNewWeight(""); },
    onError: (e: any) => toast.error(e?.message || "Create failed"),
  });
  const mUpdate = useMutation({
    mutationFn: updateIcebreaker,
    onSuccess: () => { toast.success("Updated"); void qc.invalidateQueries({ queryKey: ["admin","icebreakers"] }); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });
  const mDelete = useMutation({
    mutationFn: deleteIcebreaker,
    onSuccess: () => { toast.success("Deleted"); void qc.invalidateQueries({ queryKey: ["admin","icebreakers"] }); },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Icebreakers</h1>
        <p className="text-sm text-gray-600">Manage questions, toggle active, and tune weights.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-2 items-end">
          <div className="flex-1">
            <label htmlFor="icebreaker-question" className="text-sm text-gray-700">Question</label>
            <Input id="icebreaker-question" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="e.g., What's your ideal weekend?" />
          </div>
          <div className="w-48">
            <label htmlFor="icebreaker-category" className="text-sm text-gray-700">Category</label>
            <Input id="icebreaker-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="optional" />
          </div>
          <div className="w-28">
            <label htmlFor="icebreaker-weight" className="text-sm text-gray-700">Weight</label>
            <Input id="icebreaker-weight" type="number" value={newWeight as any} onChange={(e) => setNewWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0-100" />
          </div>
          <Button
            onClick={() => {
              if (!newText.trim()) return toast.error("Enter a question");
              mCreate.mutate({ text: newText.trim(), category: newCategory.trim() || undefined, active: true, weight: typeof newWeight === "number" ? newWeight : undefined });
            }}
            disabled={mCreate.isPending}
          >Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Active</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-40">Category</TableHead>
                <TableHead className="w-28">Weight</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">Loading…</TableCell></TableRow>
              )}
              {isError && (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Button variant="outline" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
              )}
              {data?.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Switch checked={q.active} onCheckedChange={(v) => mUpdate.mutate({ id: q.id, active: v })} />
                  </TableCell>
                  <TableCell>
                    <Input defaultValue={q.text} onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== q.text) mUpdate.mutate({ id: q.id, text: val });
                    }} />
                  </TableCell>
                  <TableCell>
                    <Input defaultValue={q.category || ""} onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (q.category || "")) mUpdate.mutate({ id: q.id, category: val || undefined });
                    }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" defaultValue={q.weight ?? ""} onBlur={(e) => {
                      const raw = e.target.value;
                      const val = raw === "" ? undefined : Number(raw);
                      if ((val ?? null) !== (q.weight ?? null)) mUpdate.mutate({ id: q.id, weight: val });
                    }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => mDelete.mutate(q.id)} disabled={mDelete.isPending}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">No questions yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
