"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
  const { token } = useAuthContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PexelsImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token) return;
    
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const result = await searchImages(token, query, 1, 15);
      
      if (result.success && result.images) {
        setResults(result.images);
      } else {
        throw new Error(result.error || "Failed to search images");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error searching images");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Pexels Images</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
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
        {loading && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-40 h-4 rounded" />
            <Skeleton className="w-32 h-4 rounded" />
          </div>
        )}
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {results.map((img) => (
            <button
              key={img.id}
              type="button"
              className="focus:outline-none border-2 border-transparent hover:border-pink-500 rounded overflow-hidden"
              onClick={() => {
                onSelect(img.src.large);
                onClose();
              }}
            >
              <img
                src={img.src.medium}
                alt={img.alt}
                className="w-full h-32 object-cover"
              />
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Powered by{" "}
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
