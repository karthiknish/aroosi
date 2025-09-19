"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Plus, Copy, Trash2, GripVertical } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type UISection = Section & { _id: string };
type Section = Hero | Paragraph | RichParagraph | ButtonSection | ImageOnly | ImageText | ColumnsSec | Divider | Spacer;
type Hero = { type: "hero"; title: string; subtitle?: string; cta?: BuilderCTA; imageUrl?: string; align?: "left" | "center" };
type Paragraph = { type: "paragraph"; text: string };
type RichParagraph = { type: "richParagraph"; html: string; align?: "left" | "center" };
type ButtonSection = { type: "button"; cta: BuilderCTA; align?: "left" | "center" };
type BuilderCTA = { label: string; url: string };
type ImageOnly = { type: "image"; src: string; alt?: string; width?: number; align?: "left" | "center" };
type ImageText = { type: "imageText"; image: { src: string; alt?: string; width?: number }; html: string; imagePosition?: "left" | "right" };
type ColumnsSec = { type: "columns"; columns: Array<{ html: string }>; columnCount?: 2 | 3 };
type Divider = { type: "divider" };
type Spacer = { type: "spacer"; size?: number };

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
                  {sec.type === "hero" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor={`hero-title-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Title
                          </label>
                          <Input
                            id={`hero-title-${sec._id}`}
                            value={sec.title}
                            onChange={(e) => updateSection(sec._id, { title: e.target.value })}
                            placeholder="Hero title"
                          />
                        </div>
                        <div>
                          <label htmlFor={`hero-subtitle-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Subtitle
                          </label>
                          <Input
                            id={`hero-subtitle-${sec._id}`}
                            value={sec.subtitle || ""}
                            onChange={(e) => updateSection(sec._id, { subtitle: e.target.value })}
                            placeholder="Hero subtitle"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`hero-image-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                          Image URL
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id={`hero-image-${sec._id}`}
                            value={sec.imageUrl || ""}
                            onChange={(e) => updateSection(sec._id, { imageUrl: e.target.value })}
                            placeholder="https://..."
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setMediaOpenFor(sec._id)}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {sec.type === "paragraph" && (
                    <div>
                      <label htmlFor={`paragraph-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                        Text Content
                      </label>
                      <Textarea
                        id={`paragraph-${sec._id}`}
                        value={sec.text}
                        onChange={(e) => updateSection(sec._id, { text: e.target.value })}
                        rows={4}
                        placeholder="Enter your paragraph text..."
                      />
                    </div>
                  )}

                  {sec.type === "button" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor={`button-label-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Button Label
                          </label>
                          <Input
                            id={`button-label-${sec._id}`}
                            value={sec.cta.label}
                            onChange={(e) => updateSection(sec._id, { cta: { ...sec.cta, label: e.target.value } })}
                            placeholder="Click me"
                          />
                        </div>
                        <div>
                          <label htmlFor={`button-url-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Button URL
                          </label>
                          <Input
                            id={`button-url-${sec._id}`}
                            value={sec.cta.url}
                            onChange={(e) => updateSection(sec._id, { cta: { ...sec.cta, url: e.target.value } })}
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {sec.type === "image" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label htmlFor={`image-src-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Image URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              id={`image-src-${sec._id}`}
                              value={sec.src}
                              onChange={(e) => updateSection(sec._id, { src: e.target.value })}
                              placeholder="https://..."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setMediaOpenFor(sec._id)}
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`image-alt-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                            Alt Text
                          </label>
                          <Input
                            id={`image-alt-${sec._id}`}
                            value={sec.alt || ""}
                            onChange={(e) => updateSection(sec._id, { alt: e.target.value })}
                            placeholder="Image description"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {sec.type === "spacer" && (
                    <div>
                      <label htmlFor={`spacer-size-${sec._id}`} className="block text-sm font-medium text-slate-700 mb-1">
                        Height (px)
                      </label>
                      <Input
                        id={`spacer-size-${sec._id}`}
                        type="number"
                        value={sec.size ?? 16}
                        onChange={(e) => updateSection(sec._id, { size: parseInt(e.target.value || "0", 10) })}
                        min="1"
                        max="200"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
