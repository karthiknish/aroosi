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
import { adminIcebreakersAPI, AdminIcebreaker as IceQ } from "@/lib/api/admin/icebreakers";
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
    <TableRow className="group hover:bg-neutral/5 transition-colors">
      <TableCell className="w-12">
        <Switch
          checked={q.active}
          onCheckedChange={(v) => handleSave("active", v)}
          className="data-[state=checked]:bg-primary"
        />
      </TableCell>
      <TableCell>
        <div className="relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => handleSave("text", text)}
            className="border-transparent bg-transparent hover:bg-base-light hover:border-neutral/20 focus:bg-base-light focus:border-primary transition-all pr-8 font-medium text-neutral-dark"
          />
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
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
          className="border-transparent bg-transparent hover:bg-base-light hover:border-neutral/20 focus:bg-base-light focus:border-primary transition-all text-sm text-neutral"
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
          className="border-transparent bg-transparent hover:bg-base-light hover:border-neutral/20 focus:bg-base-light focus:border-primary transition-all text-right text-sm text-neutral"
        />
      </TableCell>
      <TableCell className="w-16 text-right">
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-all"
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
            <div className="bg-neutral/5 p-4 rounded-lg text-sm italic text-neutral my-2 border border-neutral/10">
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
    queryFn: () => adminIcebreakersAPI.list(),
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
    mutationFn: (payload: {
      text: string;
      category?: string;
      active?: boolean;
      weight?: number;
    }) => adminIcebreakersAPI.create(payload),
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
    mutationFn: ({ id, ...data }: { id: string } & Partial<IceQ>) =>
      adminIcebreakersAPI.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "icebreakers"] });
    },
    onError: (e: any) => showErrorToast(e?.message || "Update failed"),
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => adminIcebreakersAPI.delete(id),
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
          <h1 className="text-3xl font-bold tracking-tight text-neutral-dark">Icebreakers</h1>
          <p className="text-neutral mt-1">
            Manage conversation starters to help users connect.
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2 bg-base-light shadow-sm border-neutral/20">
            <div className="text-xs font-medium text-neutral uppercase">Total</div>
            <div className="text-2xl font-bold text-neutral-dark">{stats.total}</div>
          </Card>
          <Card className="px-4 py-2 bg-base-light shadow-sm border-neutral/20">
            <div className="text-xs font-medium text-neutral uppercase">Active</div>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </Card>
          <Card className="px-4 py-2 bg-base-light shadow-sm border-neutral/20">
            <div className="text-xs font-medium text-neutral uppercase">Categories</div>
            <div className="text-2xl font-bold text-secondary">{stats.categories}</div>
          </Card>
        </div>
      </div>

      {/* Add New Section */}
      <Card className={cn("border-2 border-dashed shadow-none transition-all duration-300", isAddExpanded ? "bg-base-light border-primary/20" : "bg-neutral/5 border-neutral/20")}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsAddExpanded(!isAddExpanded)}>
          <CardTitle className="text-lg font-medium flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-dark">
              <div className={cn("p-1 rounded-full transition-colors", isAddExpanded ? "bg-primary/10 text-primary" : "bg-neutral/10 text-neutral")}>
                <Plus className="h-4 w-4" />
              </div>
              Add New Question
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-neutral">
              {isAddExpanded ? "Cancel" : "Expand"}
            </Button>
          </CardTitle>
        </CardHeader>
        {isAddExpanded && (
          <CardContent className="animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label htmlFor="new-q" className="text-xs font-semibold text-neutral uppercase tracking-wider">
                  Question Text
                </label>
                <Input
                  id="new-q"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g., What's your ideal weekend?"
                  className="bg-base-light border-neutral/20 focus:border-primary focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-48 space-y-1.5">
                <label htmlFor="new-cat" className="text-xs font-semibold text-neutral uppercase tracking-wider">
                  Category
                </label>
                <Input
                  id="new-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Fun"
                  className="bg-base-light border-neutral/20 focus:border-primary focus:ring-primary"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {uniqueCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="w-full sm:w-28 space-y-1.5">
                <label htmlFor="new-weight" className="text-xs font-semibold text-neutral uppercase tracking-wider">
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
                  className="bg-base-light border-neutral/20 focus:border-primary focus:ring-primary"
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
                className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-base-light"
              >
                {mCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Question"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters & Table */}
      <Card className="border-0 shadow-lg bg-base-light overflow-hidden">
        <div className="p-4 border-b border-neutral/10 bg-neutral/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 bg-base-light border-neutral/20"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] bg-base-light border-neutral/20">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-neutral" />
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
          
          <div className="flex items-center gap-2 text-sm text-neutral">
            <span>{filteredData.length} questions</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral/5 hover:bg-neutral/5 border-b border-neutral/10">
                <TableHead className="w-12 text-center">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleSort("active")}>
                    <div className="sr-only">Active</div>
                    {sortField === "active" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1 font-semibold text-neutral-dark" onClick={() => handleSort("text")}>
                    Question
                    {sortField === "text" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-40">
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1 font-semibold text-neutral-dark" onClick={() => handleSort("category")}>
                    Category
                    {sortField === "category" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-28 text-right">
                  <Button variant="ghost" size="sm" className="-mr-3 h-8 gap-1 font-semibold text-neutral-dark" onClick={() => handleSort("weight")}>
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
                    <div className="flex flex-col items-center gap-2 text-danger">
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
                  <TableCell colSpan={5} className="text-center py-16 text-neutral">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-neutral/5 flex items-center justify-center mb-2">
                        <MessageSquare className="h-6 w-6 text-neutral" />
                      </div>
                      <p className="font-medium text-neutral-dark">No icebreakers found</p>
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
          <div className="flex items-center justify-between p-4 border-t border-neutral/10 bg-neutral/5">
            <div className="text-sm text-neutral">
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
