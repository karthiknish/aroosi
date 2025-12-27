import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Undo2, Redo2 } from "lucide-react";

interface BuilderHeaderProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  sectionsCount: number;
  isLoading: boolean;
}

export function BuilderHeader({
  undo,
  redo,
  canUndo,
  canRedo,
  sectionsCount,
  isLoading,
}: BuilderHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white rounded-xl shadow-sm border">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">
          Email Template Builder
        </h1>
        <p className="text-slate-600">
          Create beautiful marketing emails with our drag-and-drop builder
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center gap-2"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="flex items-center gap-2"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
          Redo
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Badge variant="secondary" className="flex items-center gap-1">
          {sectionsCount} sections
        </Badge>
        {isLoading && (
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Saving...
          </Badge>
        )}

        <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
            Z
          </kbd>
          <span>undo</span>
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
            S
          </kbd>
          <span>save</span>
        </div>
      </div>
    </div>
  );
}
