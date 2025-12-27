import React from "react";
import { RefreshCw, CheckCircle2, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface StickyActionBarProps {
  autoSaveStatus: "idle" | "saving" | "saved" | "error";
  isDirty: boolean;
  loading: boolean;
  onCancel: () => void;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  autoSaveStatus,
  isDirty,
  loading,
  onCancel,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-light/80 backdrop-blur-xl border-t border-neutral/10 z-50 py-4 px-4 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          {autoSaveStatus === "saving" && (
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving changes...</span>
            </div>
          )}
          {autoSaveStatus === "saved" && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All changes saved</span>
            </div>
          )}
          {autoSaveStatus === "error" && (
            <div className="flex items-center gap-1.5 text-danger">
              <CloudOff className="w-3.5 h-3.5" />
              <span>Auto-save failed</span>
            </div>
          )}
          {autoSaveStatus === "idle" && isDirty && (
            <div className="flex items-center gap-1.5 text-neutral-light">
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="min-w-[100px] sm:min-w-[120px] rounded-full border-neutral/20 hover:bg-neutral/5 h-10 sm:h-11 text-sm"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="min-w-[120px] sm:min-w-[140px] flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 sm:h-11 text-sm"
          >
            {loading && <LoadingSpinner size={18} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
