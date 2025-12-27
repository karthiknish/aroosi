"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { searchImages, type PexelsImage } from "@/lib/utils/imageSearchUtil";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { cn } from "@/lib/utils";

interface PexelsImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function PexelsImageModal({
  isOpen,
  onClose,
  onSelect,
}: PexelsImageModalProps) {
  // Cookie-auth: AuthContext no longer exposes token; keep for guard if needed
  useAuthContext();
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [results, setResults] = useState<PexelsImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [total, setTotal] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const hasResults = results.length > 0;
  const maxPage = total ? Math.max(1, Math.ceil(total / perPage)) : undefined;

  const performSearch = useCallback(async () => {
    const q = committedQuery.trim();
    if (!q) {
      setResults([]);
      setTotal(undefined);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchImages(q, page, perPage);
      if (res.success) {
        setResults(res.images || []);
        setTotal(res.totalResults);
        setActiveIndex(-1);
      } else {
        setResults([]);
        setTotal(undefined);
        setError(res.error || "Failed to search images");
      }
    } finally {
      setLoading(false);
    }
  }, [committedQuery, page, perPage]);

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setPage(1); // reset page on manual search
      setCommittedQuery(query);
    },
    [query]
  );

  // Debounce query typing (user pauses 400ms)
  useEffect(() => {
    if (!query.trim()) {
      setCommittedQuery("");
      return;
    }
    const id = setTimeout(() => {
      setPage(1);
      setCommittedQuery(query);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  // Trigger search when committedQuery or page changes
  useEffect(() => {
    void performSearch();
  }, [performSearch]);

  const canPrev = page > 1;
  const canNext = useMemo(() => {
    if (!maxPage) return results.length === perPage; // fallback heuristic
    return page < maxPage;
  }, [page, maxPage, results.length, perPage]);

  const onPrev = () => {
    if (!canPrev) return;
    setPage((p) => Math.max(1, p - 1));
  };

  const onNext = () => {
    if (!canNext) return;
    setPage((p) => p + 1);
  };

  // Keyboard navigation within grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasResults) return;
    const cols = 3; // sm grid size baseline
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + cols));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - cols));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const img = results[activeIndex];
      if (img) {
        onSelect(img.src.large);
        onClose();
      }
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && gridRef.current) {
      const btn =
        gridRef.current.querySelectorAll<HTMLButtonElement>("button[data-img]")[
          activeIndex
        ];
      if (btn) btn.focus();
    }
  }, [activeIndex]);

  // Autofocus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setCommittedQuery("");
      setResults([]);
      setPage(1);
      setActiveIndex(-1);
      setError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-base-light gap-0 border-neutral/20 shadow-2xl sm:rounded-xl h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-neutral/10 bg-base-light shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-neutral-dark">
                  Select Image
                </DialogTitle>
                <p className="text-xs text-neutral-dark/70 mt-0.5">
                  Search high-quality photos from Pexels
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 border-b border-neutral/10 bg-neutral/5 shrink-0">
          <form
            onSubmit={handleSearch}
            className="relative flex gap-2"
            role="search"
            aria-label="Search images"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
              <Input
                ref={inputRef}
                placeholder="Search for images (e.g. wedding, couple, love)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-base-light border-neutral/20 focus-visible:ring-primary/20 focus-visible:border-primary text-neutral-dark"
                aria-label="Image search query"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="bg-primary hover:bg-primary-dark text-white min-w-[100px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </form>
          
          <div className="flex items-center justify-between mt-3 text-xs text-neutral-dark/70 px-1">
            <div>
              {loading
                ? "Searching..."
                : error
                  ? <span className="text-danger">{error}</span>
                  : hasResults
                    ? total
                      ? `Found ${total.toLocaleString()} results`
                      : `${results.length} results`
                    : committedQuery
                      ? "No results found"
                      : "Enter a keyword to start searching"}
            </div>
            {hasResults && (
              <div className="flex items-center gap-2">
                <span className="mr-2">
                  Page {page} {maxPage ? `of ${maxPage}` : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
                    onClick={onPrev}
                    disabled={!canPrev || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
                    onClick={onNext}
                    disabled={!canNext || loading}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-neutral/5 p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-full aspect-[3/2] rounded-lg bg-neutral/10" />
                  <Skeleton className="h-3 w-2/3 rounded bg-neutral/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-light">
              <div className="p-3 bg-danger/10 rounded-full mb-3">
                <ImageIcon className="w-6 h-6 text-danger" />
              </div>
              <p className="text-neutral-dark font-medium mb-1">Failed to load images</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : !hasResults && committedQuery ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-light">
              <div className="p-3 bg-neutral/10 rounded-full mb-3">
                <Search className="w-6 h-6 text-neutral-light" />
              </div>
              <p className="text-neutral-dark font-medium mb-1">No images found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : !hasResults ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-light">
              <div className="p-3 bg-primary/5 rounded-full mb-3">
                <ImageIcon className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-neutral-dark font-medium mb-1">Start searching</p>
              <p className="text-sm max-w-xs mx-auto">
                Enter keywords above to find high-quality photos for your blog post
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              ref={gridRef}
              role="listbox"
              aria-label="Search results"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              {results.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  data-img
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={cn(
                    "group relative aspect-[3/2] rounded-lg overflow-hidden bg-neutral/10 focus:outline-none transition-all duration-200",
                    idx === activeIndex
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1"
                  )}
                  onClick={() => {
                    onSelect(img.src.large);
                    onClose();
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <img
                    src={img.src.medium}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-left">
                    <p className="text-white text-xs font-medium truncate w-full">
                      {img.alt || "Untitled"}
                    </p>
                    {img.photographer && (
                      <p className="text-white/80 text-[10px] truncate w-full">
                        by {img.photographer}
                      </p>
                    )}
                  </div>
                  
                  {/* Selection Indicator Overlay */}
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-active:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral/10 bg-base-light shrink-0 flex items-center justify-between text-xs text-neutral-dark/70">
          <div className="flex items-center gap-2">
            <span>Photos provided by</span>
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline font-medium"
            >
              Pexels
            </a>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-neutral-dark hover:bg-neutral/5">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
