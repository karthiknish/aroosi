"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { Profile } from "@aroosi/shared/types";

interface ManualMatchSectionProps {
  profileId?: string;
  manualMatchName: string;
  setManualMatchName: (val: string) => void;
  creatingMatch: boolean;
  matchError: string | null;
  suggestions: Profile[];
  selectedProfile: Profile | null;
  setSelectedProfile: (p: Profile | null) => void;
  handleCreateMatch: () => Promise<void>;
  matches: Profile[];
}

export function ManualMatchSection({
  profileId,
  manualMatchName,
  setManualMatchName,
  creatingMatch,
  matchError,
  suggestions,
  selectedProfile,
  setSelectedProfile,
  handleCreateMatch,
  matches,
}: ManualMatchSectionProps) {
  if (!profileId) return null;

  return (
    <section className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
      <h3 className="text-lg font-bold text-primary mb-2">Manual Match</h3>
      <p className="text-sm text-primary/70 mb-6">
        Create an immediate mutual match with another profile.
      </p>

      <div className="relative">
        <div className="flex gap-3">
          <Input
            type="text"
            value={manualMatchName}
            onChange={(e) => {
              setManualMatchName(e.target.value);
              setSelectedProfile(null);
            }}
            placeholder="Search profile by name..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-primary/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          />
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 h-[42px] px-6 text-white"
            disabled={(!manualMatchName.trim() && !selectedProfile) || creatingMatch}
            onClick={handleCreateMatch}
          >
            {creatingMatch ? <LoadingSpinner size={16} /> : "Create Match"}
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-base-light border border-neutral/20 rounded-xl shadow-xl overflow-hidden z-50">
            {suggestions.map((sug) => (
              <Button
                key={sug._id}
                type="button"
                variant="ghost"
                className="w-full text-left px-4 py-3 hover:bg-neutral/5 transition-colors border-b border-neutral/10 last:border-0 h-auto justify-start rounded-none"
                onClick={() => {
                  setSelectedProfile(sug);
                  setManualMatchName(sug.fullName);
                  // clear suggestions implicitly or explicitly
                }}
              >
                <div className="flex flex-col items-start">
                  <div className="font-semibold text-neutral-dark">{sug.fullName}</div>
                  <div className="text-xs text-neutral-light">{sug.city}</div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {matchError && (
        <p className="text-sm text-danger mt-3 font-medium">{matchError}</p>
      )}

      {/* Matches List */}
      {matches.length > 0 && (
        <div className="mt-8 pt-6 border-t border-primary/10">
          <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
            Current Matches ({matches.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <div
                key={m._id}
                className="bg-base-light px-3 py-1.5 rounded-full border border-primary/10 text-xs font-medium text-primary flex items-center gap-2"
              >
                {m.fullName}
                <span className="w-1 h-1 rounded-full bg-primary/30" />
                {m.city}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
