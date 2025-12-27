"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProfileFormHeaderProps {
  onCancel?: () => void;
  loading: boolean;
}

export function ProfileFormHeader({ onCancel, loading }: ProfileFormHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-neutral/10 pb-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-dark">Edit Profile</h2>
        <p className="text-sm text-neutral-dark/70 mt-1">Update user information and settings</p>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="border-neutral/20 text-neutral-dark hover:bg-neutral/5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white"
          disabled={loading}
        >
          {loading && <LoadingSpinner size={16} className="mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
