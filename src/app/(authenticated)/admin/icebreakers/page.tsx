"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { 
  Trash2, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Search, 
  ArrowUpDown, 
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type IceQ = {
  id: string;
  text: string;
  active: boolean;
  category?: string | null;
  weight?: number | null;
  createdAt: number;
};

async function listIcebreakers(): Promise<IceQ[]> {
  const res = await fetch("/api/admin/icebreakers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch questions");
  const json = await res.json();
  return (json?.data?.items as IceQ[]) ?? [];
}

async function createIcebreaker(payload: {
  text: string;
  category?: string;
  active?: boolean;
  weight?: number;
}) {
  const res = await fetch("/api/admin/icebreakers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateIcebreaker(payload: {
  id: string;
  text?: string;
  category?: string;
  active?: boolean;
  weight?: number;
}) {
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

function IcebreakerRow({
  q,
  onUpdate,
  onDelete,
}: {
  q: IceQ;
  onUpdate: (id: string, data: Partial<IceQ>) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(q.text);
  const [category, setCategory] = useState(q.category || "");
  const [weight, setWeight] = useState<number | "">(q.weight ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Sync local state with props when they change (e.g. external update)
  useEffect(() => {
    setText(q.text);
    setCategory(q.category || "");
    setWeight(q.weight ?? "");
  }, [q]);

  const handleSave = (field: keyof IceQ, value: any) => {
    // Only save if changed
    if (value === q[field] || (value === "" && q[field] === null)) return;
    
    setIsSaving(true);
    onUpdate(q.id, { [field]: value });
    // Reset saving indicator after a moment
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <TableRow className="group hover:bg-slate-50/80 transition-colors">
      <TableCell className="w-12">
        <Switch
          checked={q.active}
          onCheckedChange={(v) => handleSave("active", v)}
          className="data-[state=checked]:bg-pink-500"
        />
      </TableCell>
      <TableCell>
        <div className="relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => handleSave("text", text)}
            className="border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-pink-500 transition-all pr-8 font-medium text-slate-700"
          />
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3 w-3 animate-spin text-pink-500" />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="w-40">
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => handleSave("category", category || null)}
          placeholder="Category"
          className="border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-pink-500 transition-all text-sm text-slate-600"
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="number"
          value={weight}
          onChange={(e) =>
            setWeight(e.target.value === "" ? "" : Number(e.target.value))
          }
          onBlur={() => handleSave("weight", weight === "" ? null : weight)}
          placeholder="0"
          className="border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-pink-500 transition-all text-right text-sm text-slate-600"
        />
      </TableCell>
      <TableCell className="w-16 text-right">
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Icebreaker</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-50 p-4 rounded-lg text-sm italic text-slate-600 my-2 border border-slate-100">
              "{q.text}"
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(q.id);
                  setShowDeleteDialog(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export default function AdminIcebreakersPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "icebreakers"],
    queryFn: listIcebreakers,
  });

  // Form state
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newWeight, setNewWeight] = useState<number | "">("");
  const [isAddExpanded, setIsAddExpanded] = useState(false);

  // Filter/Sort/Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof IceQ>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const mCreate = useMutation({
    mutationFn: createIcebreaker,
    onSuccess: () => {
      showSuccessToast("Icebreaker question created");
      void qc.invalidateQueries({ queryKey: ["admin", "icebreakers"] });
      setNewText("");
      setNewCategory("");
      setNewWeight("");
      setIsAddExpanded(false);
    },
    onError: (e: any) => showErrorToast(e?.message || "Create failed"),
  });

  const mUpdate = useMutation({
    mutationFn: updateIcebreaker,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "icebreakers"] });
    },
    onError: (e: any) => showErrorToast(e?.message || "Update failed"),
  });

  const mDelete = useMutation({
    mutationFn: deleteIcebreaker,
    onSuccess: () => {
      showSuccessToast("Deleted");
      void qc.invalidateQueries({ queryKey: ["admin", "icebreakers"] });
    },
    onError: (e: any) => showErrorToast(e?.message || "Delete failed"),
  });

  // Derived data
  const uniqueCategories = useMemo(() => {
    if (!data) return [];
    const cats = new Set(data.map(d => d.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.text.toLowerCase().includes(q) || 
          item.category?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchQuery, categoryFilter, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, categories: 0 };
    return {
      total: data.length,
      active: data.filter(d => d.active).length,
      categories: uniqueCategories.length
    };
  }, [data, uniqueCategories]);

  const handleSort = (field: keyof IceQ) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc for new field
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Icebreakers</h1>
          <p className="text-slate-500 mt-1">
            Manage conversation starters to help users connect.
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2 bg-white shadow-sm border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase">Total</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </Card>
          <Card className="px-4 py-2 bg-white shadow-sm border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </Card>
          <Card className="px-4 py-2 bg-white shadow-sm border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase">Categories</div>
            <div className="text-2xl font-bold text-purple-600">{stats.categories}</div>
          </Card>
        </div>
      </div>

      {/* Add New Section */}
      <Card className={cn("border-2 border-dashed shadow-none transition-all duration-300", isAddExpanded ? "bg-white border-pink-200" : "bg-slate-50/50 border-slate-200")}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsAddExpanded(!isAddExpanded)}>
          <CardTitle className="text-lg font-medium flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <div className={cn("p-1 rounded-full transition-colors", isAddExpanded ? "bg-pink-100 text-pink-600" : "bg-slate-200 text-slate-500")}>
                <Plus className="h-4 w-4" />
              </div>
              Add New Question
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-slate-500">
              {isAddExpanded ? "Cancel" : "Expand"}
            </Button>
          </CardTitle>
        </CardHeader>
        {isAddExpanded && (
          <CardContent className="animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label htmlFor="new-q" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Question Text
                </label>
                <Input
                  id="new-q"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g., What's your ideal weekend?"
                  className="bg-white border-slate-200 focus:border-pink-500 focus:ring-pink-500"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-48 space-y-1.5">
                <label htmlFor="new-cat" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </label>
                <Input
                  id="new-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Fun"
                  className="bg-white border-slate-200 focus:border-pink-500 focus:ring-pink-500"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {uniqueCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="w-full sm:w-28 space-y-1.5">
                <label htmlFor="new-weight" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Weight
                </label>
                <Input
                  id="new-weight"
                  type="number"
                  value={newWeight as any}
                  onChange={(e) =>
                    setNewWeight(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="0"
                  className="bg-white border-slate-200 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <Button
                onClick={() => {
                  if (!newText.trim()) return showErrorToast("Enter a question");
                  mCreate.mutate({
                    text: newText.trim(),
                    category: newCategory.trim() || undefined,
                    active: true,
                    weight: typeof newWeight === "number" ? newWeight : undefined,
                  });
                }}
                disabled={mCreate.isPending}
                className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white"
              >
                {mCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Question"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters & Table */}
      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 bg-white border-slate-200"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] bg-white border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{filteredData.length} questions</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-100">
                <TableHead className="w-12 text-center">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleSort("active")}>
                    <div className="sr-only">Active</div>
                    {sortField === "active" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1 font-semibold text-slate-700" onClick={() => handleSort("text")}>
                    Question
                    {sortField === "text" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-40">
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1 font-semibold text-slate-700" onClick={() => handleSort("category")}>
                    Category
                    {sortField === "category" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-28 text-right">
                  <Button variant="ghost" size="sm" className="-mr-3 h-8 gap-1 font-semibold text-slate-700" onClick={() => handleSort("weight")}>
                    Weight
                    {sortField === "weight" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-red-500">
                      <AlertTriangle className="h-8 w-8" />
                      <p>Failed to load questions</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                        <MessageSquare className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-600">No icebreakers found</p>
                      <p className="text-sm">Try adjusting your filters or add a new question.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((q) => (
                  <IcebreakerRow
                    key={q.id}
                    q={q}
                    onUpdate={(id, d) => mUpdate.mutate({ id, ...d })}
                    onDelete={(id) => mDelete.mutate(id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
