"use client";

import type React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  Undo2,
  Redo2,
  Eye,
  Copy,
  Palette,
  Plus,
  GripVertical,
  Trash2,
  ImageIcon,
} from "lucide-react";
import {
  previewMarketingEmail,
  listBuilderPresets,
  createBuilderPreset,
} from "@/lib/marketingEmailApi";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { EmailSettings } from "../components/EmailSettings";
import { AddSections } from "../components/AddSections";
import { PresetManager } from "../components/PresetManager";
import { SectionEditor } from "../components/SectionEditor";
import { JSONEditor } from "../components/JSONEditor";
import { TemplatePreview } from "../components/TemplatePreview";

type BuilderCTA = { label: string; url: string };
type Hero = {
  type: "hero";
  title: string;
  subtitle?: string;
  cta?: BuilderCTA;
  imageUrl?: string;
  align?: "left" | "center";
};
type Paragraph = { type: "paragraph"; text: string };
type RichParagraph = {
  type: "richParagraph";
  html: string;
  align?: "left" | "center";
};
type ButtonSection = {
  type: "button";
  cta: BuilderCTA;
  align?: "left" | "center";
};
type ImageOnly = {
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  align?: "left" | "center";
};
type ImageText = {
  type: "imageText";
  image: { src: string; alt?: string; width?: number };
  html: string;
  imagePosition?: "left" | "right";
};
type ColumnsSec = {
  type: "columns";
  columns: Array<{ html: string }>;
  columnCount?: 2 | 3;
};
type Divider = { type: "divider" };
type Spacer = { type: "spacer"; size?: number };
type Section =
  | Hero
  | Paragraph
  | RichParagraph
  | ButtonSection
  | ImageOnly
  | ImageText
  | ColumnsSec
  | Divider
  | Spacer;
type BuilderSchema = {
  subject: string;
  preheader?: string;
  sections: Section[];
};
type UISection = Section & { _id: string };

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toJson(schema: BuilderSchema) {
  return JSON.stringify(schema, null, 2);
}

// History state for undo/redo
type HistoryState = {
  subject: string;
  preheader: string;
  sections: UISection[];
};

const MAX_HISTORY_SIZE = 50;

export default function BuilderEmailPage() {
  // Visual builder state
  const [subject, setSubject] = useState("My Builder Email");
  const [preheader, setPreheader] = useState("Short preview text");
  const [sections, setSections] = useState<UISection[]>([
    {
      _id: uuid(),
      type: "hero",
      title: "Welcome!",
      subtitle: "Nice to meet you",
    },
    { _id: uuid(), type: "paragraph", text: "This is a builder-based email." },
    {
      _id: uuid(),
      type: "button",
      cta: { label: "Visit Site", url: "https://aroosi.app" },
    },
  ]);

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"design" | "json">("design");
  const [jsonText, setJsonText] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [presets, setPresets] = useState<
    Array<{ id: string; name: string; schema: any }>
  >([]);
  const [presetName, setPresetName] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Media picker
  const [mediaOpenFor, setMediaOpenFor] = useState<string | null>(null);

  // History management functions
  const saveToHistory = useCallback(() => {
    const currentState: HistoryState = {
      subject,
      preheader,
      sections: JSON.parse(JSON.stringify(sections)), // Deep copy
    };

    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    historyTimeoutRef.current = setTimeout(() => {
      setHistory((prev) => {
        const newHistory = [...prev.slice(0, historyIndex + 1), currentState];
        return newHistory.slice(-MAX_HISTORY_SIZE);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    }, 500); // Debounce saves
  }, [subject, preheader, sections, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSubject(prevState.subject);
      setPreheader(prevState.preheader);
      setSections(prevState.sections);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSubject(nextState.subject);
      setPreheader(nextState.preheader);
      setSections(nextState.sections);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex]);

  // Derived schema from UI state
  const schema: BuilderSchema = useMemo(
    () => ({
      subject,
      preheader: preheader || undefined,
      sections: sections.map(({ _id, ...rest }) => rest as Section),
    }),
    [subject, preheader, sections]
  );

  // Move keyboard shortcuts after handleSavePreset declaration

  useEffect(() => {
    (async () => {
      const res = await listBuilderPresets();
      if (res.success && (res.data as any)?.presets) {
        setPresets((res.data as any).presets);
      }
    })();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (presetName.trim()) {
          handleSavePreset();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, presetName]);

  useEffect(() => {
    // Keep JSON tab in sync when switching to it
    if (activeTab === "json") setJsonText(toJson(schema));
  }, [activeTab, schema]);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const res = await previewMarketingEmail({
        templateKey: "builder",
        params: { schema } as any,
      });
      if (res.success && (res.data as any)?.html) {
        setPreviewHtml((res.data as any).html);
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(toJson(schema));
      showSuccessToast("Copied JSON to clipboard");
    } catch {}
  };

  const applyJsonToDesign = () => {
    setIsLoading(true);
    try {
      const parsed: BuilderSchema = JSON.parse(jsonText);
      setSubject(parsed.subject || "");
      setPreheader(parsed.preheader || "");
      const ui = (parsed.sections || []).map((s) => ({
        _id: uuid(),
        ...(s as Section),
      }));
      setSections(ui);
      showSuccessToast("Applied JSON to design");
      setActiveTab("design");
      saveToHistory();
    } catch {
      showErrorToast("", "Invalid JSON");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await createBuilderPreset(presetName || "Untitled", schema);
      if (res.success) {
        const list = await listBuilderPresets();
        if (list.success && (list.data as any)?.presets)
          setPresets((list.data as any).presets);
        setPresetName("");
        showSuccessToast("Preset saved");
      }
    } finally {
      setIsLoading(false);
    }
  }, [presetName, schema]);

  const loadPreset = async (p: { id: string; name: string; schema: any }) => {
    setIsLoading(true);
    try {
      const s = p.schema as BuilderSchema;
      setSubject(s.subject || "");
      setPreheader(s.preheader || "");
      setSections(
        (s.sections || []).map((sec) => ({ _id: uuid(), ...(sec as Section) }))
      );
      setActiveTab("design");
      saveToHistory();
    } catch {
      showErrorToast("", "Failed to load preset");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced DnD with better visual feedback
  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const targetId = target
      .closest("[data-section-id]")
      ?.getAttribute("data-section-id");
    if (targetId && targetId !== draggedOver) {
      setDraggedOver(targetId);
    }
  };
  const onDragLeave = () => setDraggedOver(null);
  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = sections.findIndex((s) => s._id === dragId);
    const to = sections.findIndex((s) => s._id === targetId);
    if (from < 0 || to < 0) return;
    const next = sections.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
    setDragId(null);
    setDraggedOver(null);
    saveToHistory();
  };

  const addSection = (type: Section["type"]) => {
    const base: any = { _id: uuid(), type };
    if (type === "hero")
      Object.assign(base, {
        title: "Hero title",
        subtitle: "Subtitle",
        align: "center",
      });
    if (type === "paragraph") Object.assign(base, { text: "Paragraph text" });
    if (type === "button")
      Object.assign(base, {
        cta: { label: "Click me", url: "https://aroosi.app" },
        align: "center",
      });
    if (type === "richParagraph")
      Object.assign(base, {
        html: "<p>Rich text paragraph</p>",
        align: "left",
      });
    if (type === "image")
      Object.assign(base, { src: "", alt: "", align: "center", width: 560 });
    if (type === "imageText")
      Object.assign(base, {
        image: { src: "", alt: "", width: 280 },
        html: "<p>Your content</p>",
        imagePosition: "left",
      });
    if (type === "columns")
      Object.assign(base, {
        columns: [{ html: "<p>Column 1</p>" }, { html: "<p>Column 2</p>" }],
        columnCount: 2,
      });
    if (type === "divider") Object.assign(base, {});
    if (type === "spacer") Object.assign(base, { size: 16 });
    setSections((prev) => {
      const newSections = [...prev, base];
      // Save to history after state update
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });
  };

  const removeSection = (id: string) =>
    setSections((prev) => {
      const newSections = prev.filter((s) => s._id !== id);
      // Save to history after state update
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });

  const duplicateSection = (id: string) => {
    const src = sections.find((s) => s._id === id);
    if (!src) return;
    const copy = { ...src, _id: uuid() } as UISection;
    const idx = sections.findIndex((s) => s._id === id);
    const next = sections.slice();
    next.splice(idx + 1, 0, copy);
    setSections(next);
    saveToHistory();
  };

  // Field editors per section type
  const updateSection = (id: string, patch: Partial<UISection>) => {
    setSections((prev) => {
      const newSections = prev.map((s) =>
        s._id === id ? ({ ...s, ...patch } as UISection) : s
      );
      // Save to history after state update
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white rounded-xl shadow-sm border">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">
              Email Template Builder
            </h1>
            <p className="text-slate-600">
              Create beautiful marketing emails with our drag-and-drop builder
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
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
              disabled={historyIndex >= history.length - 1}
              className="flex items-center gap-2"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="secondary" className="flex items-center gap-1">
              {sections.length} sections
            </Badge>
            {isLoading && (
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Saving...
              </Badge>
            )}

            {/* Keyboard shortcuts help */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="xl:col-span-3 space-y-6">
            <EmailSettings
              subject={subject}
              setSubject={setSubject}
              preheader={preheader}
              setPreheader={setPreheader}
            />

            <AddSections addSection={addSection} />

            <PresetManager
              presets={presets}
              presetName={presetName}
              setPresetName={setPresetName}
              handleSavePreset={handleSavePreset}
              loadPreset={loadPreset}
            />

            <Card>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="subject-input"
                    className="text-sm font-medium text-slate-700"
                  >
                    Subject Line
                  </label>
                  <Input
                    id="subject-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    {subject.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="preheader-input"
                    className="text-sm font-medium text-slate-700"
                  >
                    Preheader Text
                  </label>
                  <Input
                    id="preheader-input"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Short preview text"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    {preheader.length}/150 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            <AddSections addSection={addSection} />

            <PresetManager
              presets={presets}
              presetName={presetName}
              setPresetName={setPresetName}
              handleSavePreset={handleSavePreset}
              loadPreset={loadPreset}
            />
          </div>

          {/* Main Editor Area */}
          <div className="xl:col-span-9">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
            >
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-slate-100 p-1 rounded-lg">
                  <TabsTrigger
                    value="design"
                    className="data-[state=active]:bg-white data-[state=active]:shadow px-4 py-2 rounded-md font-medium"
                  >
                    Visual Editor
                  </TabsTrigger>
                  <TabsTrigger
                    value="json"
                    className="data-[state=active]:bg-white data-[state=active]:shadow px-4 py-2 rounded-md font-medium"
                  >
                    JSON Editor
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyJson}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </Button>
                  <Button
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {isPreviewLoading ? "Loading..." : "Preview"}
                  </Button>
                </div>
              </div>

              <TabsContent value="design" className="space-y-4">
                <SectionEditor
                  sections={sections}
                  addSection={addSection}
                  removeSection={removeSection}
                  duplicateSection={duplicateSection}
                  updateSection={updateSection}
                  dragId={dragId}
                  draggedOver={draggedOver}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDropOn={onDropOn}
                  setMediaOpenFor={setMediaOpenFor}
                />

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Email Sections
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      Drag and drop sections to reorder them
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Sections list */}
                    <div className="space-y-3">
                      {sections.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                            <Plus className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 mb-2">
                            No sections yet
                          </h3>
                          <p className="text-slate-600 mb-4">
                            Add your first section to get started building your
                            email
                          </p>
                          <div className="flex justify-center gap-2">
                            <Button
                              onClick={() => addSection("hero")}
                              className="flex items-center gap-2"
                            >
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
                              dragId === sec._id &&
                                "opacity-50 rotate-2 scale-105",
                              draggedOver === sec._id &&
                                "border-blue-500 bg-blue-50",
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
                                <span className="text-sm text-slate-500">
                                  #{index + 1}
                                </span>
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
                                      <label
                                        htmlFor={`hero-title-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Title
                                      </label>
                                      <Input
                                        id={`hero-title-${sec._id}`}
                                        value={sec.title}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder="Hero title"
                                      />
                                    </div>
                                    <div>
                                      <label
                                        htmlFor={`hero-subtitle-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Subtitle
                                      </label>
                                      <Input
                                        id={`hero-subtitle-${sec._id}`}
                                        value={sec.subtitle || ""}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            subtitle: e.target.value,
                                          })
                                        }
                                        placeholder="Hero subtitle"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`hero-image-${sec._id}`}
                                      className="block text-sm font-medium text-slate-700 mb-1"
                                    >
                                      Image URL
                                    </label>
                                    <div className="flex gap-2">
                                      <Input
                                        id={`hero-image-${sec._id}`}
                                        value={sec.imageUrl || ""}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            imageUrl: e.target.value,
                                          })
                                        }
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
                                  <label
                                    htmlFor={`paragraph-${sec._id}`}
                                    className="block text-sm font-medium text-slate-700 mb-1"
                                  >
                                    Text Content
                                  </label>
                                  <Textarea
                                    id={`paragraph-${sec._id}`}
                                    value={sec.text}
                                    onChange={(e) =>
                                      updateSection(sec._id, {
                                        text: e.target.value,
                                      })
                                    }
                                    rows={4}
                                    placeholder="Enter your paragraph text..."
                                  />
                                </div>
                              )}

                              {sec.type === "button" && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label
                                        htmlFor={`button-label-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Button Label
                                      </label>
                                      <Input
                                        id={`button-label-${sec._id}`}
                                        value={sec.cta.label}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            cta: {
                                              ...sec.cta,
                                              label: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="Click me"
                                      />
                                    </div>
                                    <div>
                                      <label
                                        htmlFor={`button-url-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Button URL
                                      </label>
                                      <Input
                                        id={`button-url-${sec._id}`}
                                        value={sec.cta.url}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            cta: {
                                              ...sec.cta,
                                              url: e.target.value,
                                            },
                                          })
                                        }
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
                                      <label
                                        htmlFor={`image-src-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Image URL
                                      </label>
                                      <div className="flex gap-2">
                                        <Input
                                          id={`image-src-${sec._id}`}
                                          value={sec.src}
                                          onChange={(e) =>
                                            updateSection(sec._id, {
                                              src: e.target.value,
                                            })
                                          }
                                          placeholder="https://..."
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setMediaOpenFor(sec._id)
                                          }
                                        >
                                          <ImageIcon className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div>
                                      <label
                                        htmlFor={`image-alt-${sec._id}`}
                                        className="block text-sm font-medium text-slate-700 mb-1"
                                      >
                                        Alt Text
                                      </label>
                                      <Input
                                        id={`image-alt-${sec._id}`}
                                        value={sec.alt || ""}
                                        onChange={(e) =>
                                          updateSection(sec._id, {
                                            alt: e.target.value,
                                          })
                                        }
                                        placeholder="Image description"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sec.type === "spacer" && (
                                <div>
                                  <label
                                    htmlFor={`spacer-size-${sec._id}`}
                                    className="block text-sm font-medium text-slate-700 mb-1"
                                  >
                                    Height (px)
                                  </label>
                                  <Input
                                    id={`spacer-size-${sec._id}`}
                                    type="number"
                                    value={sec.size ?? 16}
                                    onChange={(e) =>
                                      updateSection(sec._id, {
                                        size: parseInt(
                                          e.target.value || "0",
                                          10
                                        ),
                                      })
                                    }
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
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <JSONEditor
                  jsonText={jsonText}
                  setJsonText={setJsonText}
                  handleCopyJson={handleCopyJson}
                  applyJsonToDesign={applyJsonToDesign}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Preview Section */}
        <TemplatePreview
          previewHtml={previewHtml}
          isPreviewLoading={isPreviewLoading}
          handlePreview={handlePreview}
        />
      </div>

      {/* Media picker dialog */}
      <PexelsImageModal
        isOpen={!!mediaOpenFor}
        onClose={() => setMediaOpenFor(null)}
        onSelect={(url) => {
          if (!mediaOpenFor) return;
          const s = sections.find((x) => x._id === mediaOpenFor);
          if (!s) return;
          if (s.type === "hero") updateSection(s._id, { imageUrl: url } as any);
          else if (s.type === "image")
            updateSection(s._id, { src: url } as any);
          else if (s.type === "imageText")
            updateSection(s._id, {
              image: { ...(s as any).image, src: url },
            } as any);
          setMediaOpenFor(null);
        }}
      />
    </div>
  );
}
