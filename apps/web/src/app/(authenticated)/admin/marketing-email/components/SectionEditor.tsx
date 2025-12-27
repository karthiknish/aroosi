"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Plus, Copy, Trash2, GripVertical } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { SectionItemEditor } from "../builder/components/SectionItemEditor";
import { UISection, Section } from "../builder/types";

interface SectionEditorProps {
  sections: UISection[];
  addSection: (type: Section["type"]) => void;
  removeSection: (id: string) => void;
  duplicateSection: (id: string) => void;
  updateSection: (id: string, patch: Partial<UISection>) => void;
  dragId: string | null;
  draggedOver: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDropOn: (targetId: string) => void;
  setMediaOpenFor: (id: string | null) => void;
}

export function SectionEditor({
  sections,
  addSection,
  removeSection,
  duplicateSection,
  updateSection,
  dragId,
  draggedOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDropOn,
  setMediaOpenFor,
}: SectionEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Email Sections
        </CardTitle>
        <p className="text-sm text-slate-600">Drag and drop sections to reorder them</p>
      </CardHeader>
      <CardContent>
        {/* Sections list */}
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No sections yet</h3>
              <p className="text-slate-600 mb-4">Add your first section to get started building your email</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => addSection("hero")} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Hero Section
                </Button>
              </div>
            </div>
          ) : (
            sections.map((sec, index) => (
              <div
                key={sec._id}
                data-section-id={sec._id}
                draggable
                onDragStart={() => onDragStart(sec._id)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={() => onDropOn(sec._id)}
                className={cn(
                  "group relative border rounded-lg p-4 transition-all duration-200",
                  dragId === sec._id && "opacity-50 rotate-2 scale-105",
                  draggedOver === sec._id && "border-blue-500 bg-blue-50",
                  "hover:shadow-md hover:border-slate-300"
                )}
              >
                {/* Drag handle */}
                <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-slate-400 cursor-grab active:cursor-grabbing" />
                </div>

                {/* Section header */}
                <div className="flex items-center justify-between mb-3 pl-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sec.type}
                    </Badge>
                    <span className="text-sm text-slate-500">#{index + 1}</span>
                  </div>

                  {/* Section actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateSection(sec._id)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSection(sec._id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Section content */}
                <div className="pl-6">
                  <SectionItemEditor 
                    sec={sec} 
                    updateSection={updateSection} 
                    setMediaOpenFor={setMediaOpenFor} 
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
