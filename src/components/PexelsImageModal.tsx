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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { searchImages } from "@/lib/utils/imageSearchUtil";
import { useAuthContext } from "@/components/FirebaseAuthProvider";

interface PexelsImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface PexelsImage {
  id: number;
  src: {
    medium: string;
    large: string;
  };
  alt: string;
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
  const perPage = 12;
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              Search Pexels Images
            </DialogTitle>
            <span className="ml-auto text-xs text-gray-500">
              Powered by Pexels
            </span>
          </div>
        </DialogHeader>
  <div className="p-4">
          <form
            onSubmit={handleSearch}
            className="flex gap-2 mb-3"
            role="search"
            aria-label="Search images"
          >
            <Input
              ref={inputRef}
              placeholder="Search for images (e.g. wedding, couple, love)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              aria-label="Image search query"
            />
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
          <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
            <div>
              {loading
                ? "Searching…"
                : error
                  ? "Error"
                  : hasResults
                    ? total
                      ? `${total.toLocaleString()} results`
                      : `${results.length} results`
                    : committedQuery
                      ? "No results"
                      : "Enter a search term"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onPrev}
                disabled={!canPrev || loading}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={!canNext || loading}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {loading && (
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-28 rounded-md" />
            ))}
          </div>
        )}
        {error && (
          <div className="px-4 text-red-600 text-sm mb-2" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && committedQuery && !hasResults && (
          <div className="px-4 text-sm text-gray-500 pb-4">
            No images found. Try different keywords.
          </div>
        )}
        <div
          className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto focus:outline-none bg-white"
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
              className={`group focus:outline-none border rounded-md overflow-hidden relative transition-colors ${
                idx === activeIndex
                  ? "border-pink-600 ring-2 ring-pink-300"
                  : "border-transparent hover:border-pink-500"
              }`}
              onClick={() => {
                onSelect(img.src.large);
                onClose();
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <img
                src={img.src.medium}
                alt={img.alt}
                className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-105"
                draggable={false}
              />
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/40 text-white text-[10px] px-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {img.alt}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            {total != null && total >= 0 && (
              <span>
                Page {page}
                {maxPage ? ` of ${maxPage}` : ""}
              </span>
            )}
          </div>
          <a
            href="https://pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-pink-600"
          >
            Pexels
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
