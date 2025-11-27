import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ProfileCard, ProfileSearchResult } from "./ProfileCard";

interface SearchResultsProps {
  profiles: ProfileSearchResult[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  page: number;
  setPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  imgLoaded: { [userId: string]: boolean };
  setImgLoaded: (userId: string) => void;
  hasFilters: boolean;
  clearAllFilters: () => void;
}

export function SearchResults({
  profiles,
  loading,
  error,
  onRetry,
  page,
  setPage,
  totalPages,
  imgLoaded,
  setImgLoaded,
  hasFilters,
  clearAllFilters,
}: SearchResultsProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
          >
            <Skeleton className="w-full aspect-square rounded-xl" />
            <Skeleton className="h-6 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-neutral-700 mb-2">
          No profiles found
        </h3>
        <p className="text-neutral-500 max-w-md mx-auto">
          {hasFilters
            ? "Try adjusting your search criteria to see more results."
            : "There are currently no profiles available. Please check back later."}
        </p>
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((u, idx) => (
          <ProfileCard
            key={u.userId}
            result={u}
            index={idx}
            imgLoaded={!!imgLoaded[u.userId]}
            setImgLoaded={setImgLoaded}
          />
        ))}
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-neutral-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
