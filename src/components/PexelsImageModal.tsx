"use client";

import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { searchImages } from "@/lib/utils/imageSearchUtil";
import { useAuthContext } from "@/components/AuthProvider";

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
  const [results, setResults] = useState<PexelsImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [total, setTotal] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasResults = results.length > 0;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const result = await searchImages(query, page, perPage);

      if (result.success && result.images) {
        setResults(result.images);
        if (typeof (result as any).total === "number") {
          setTotal((result as any).total);
        }
      } else {
        throw new Error(result.error || "Failed to search images");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error searching images");
    } finally {
      setLoading(false);
    }
  };

  const canPrev = page > 1;
  const canNext = useMemo(() => {
    if (total == null) return true;
    const maxPage = Math.ceil(total / perPage);
    return page < maxPage;
  }, [page, total]);

  const onPrev = async () => {
    if (!canPrev) return;
    setPage((p) => Math.max(1, p - 1));
    await handleSearch();
  };

  const onNext = async () => {
    if (!canNext) return;
    setPage((p) => p + 1);
    await handleSearch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
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
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <Input
              ref={inputRef}
              placeholder="Search for images (e.g. wedding, couple, love)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
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
                : hasResults
                  ? `${results.length} results`
                  : query
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
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={!canNext || loading}
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
        {error && <div className="px-4 text-red-600 text-sm mb-2">{error}</div>}
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
          {results.map((img) => (
            <button
              key={img.id}
              type="button"
              className="group focus:outline-none border border-transparent hover:border-pink-500 rounded-md overflow-hidden relative"
              onClick={() => {
                onSelect(img.src.large);
                onClose();
              }}
            >
              <img
                src={img.src.medium}
                alt={img.alt}
                className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/40 text-white text-[10px] px-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {img.alt}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            {total != null && (
              <span>
                Page {page} {total ? `of ${Math.ceil(total / perPage)}` : ""}
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
