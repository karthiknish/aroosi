"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Plus, Copy, Pencil, Image as ImageIcon } from "lucide-react";
import { 
  previewMarketingEmail,
  listBuilderPresets,
  createBuilderPreset,
  renameBuilderPreset,
  deleteBuilderPreset,
} from "@/lib/marketingEmailApi";
import dynamic from "next/dynamic";
import { PexelsImageModal } from "@/components/PexelsImageModal";
// Lazy-load heavy editor
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), { ssr: false });

type BuilderCTA = { label: string; url: string };
type Hero = { type: "hero"; title: string; subtitle?: string; cta?: BuilderCTA; imageUrl?: string; align?: "left" | "center" };
type Paragraph = { type: "paragraph"; text: string };
type RichParagraph = { type: "richParagraph"; html: string; align?: "left" | "center" };
type ButtonSection = { type: "button"; cta: BuilderCTA; align?: "left" | "center" };
type ImageOnly = { type: "image"; src: string; alt?: string; width?: number; align?: "left" | "center" };
type ImageText = { type: "imageText"; image: { src: string; alt?: string; width?: number }; html: string; imagePosition?: "left" | "right" };
type ColumnsSec = { type: "columns"; columns: Array<{ html: string }>; columnCount?: 2 | 3 };
type Divider = { type: "divider" };
type Spacer = { type: "spacer"; size?: number };
type Section = Hero | Paragraph | RichParagraph | ButtonSection | ImageOnly | ImageText | ColumnsSec | Divider | Spacer;
type BuilderSchema = { subject: string; preheader?: string; sections: Section[] };
type UISection = (Section & { _id: string });

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toJson(schema: BuilderSchema) {
  return JSON.stringify(schema, null, 2);
}

export default function BuilderEmailPage() {
  // Visual builder state
  const [subject, setSubject] = useState("My Builder Email");
  const [preheader, setPreheader] = useState("Short preview text");
  const [sections, setSections] = useState<UISection[]>([
    { _id: uuid(), type: "hero", title: "Welcome!", subtitle: "Nice to meet you" },
    { _id: uuid(), type: "paragraph", text: "This is a builder-based email." },
    { _id: uuid(), type: "button", cta: { label: "Visit Site", url: "https://aroosi.app" } },
  ]);
  const [activeTab, setActiveTab] = useState<"design" | "json">("design");
  const [jsonText, setJsonText] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [presets, setPresets] = useState<Array<{ id: string; name: string; schema: any }>>([]);
  const [presetName, setPresetName] = useState<string>("");
  const [renamingId, setRenamingId] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  // Media picker
  const [mediaOpenFor, setMediaOpenFor] = useState<string | null>(null);

  // Derived schema from UI state
  const schema: BuilderSchema = useMemo(() => ({
    subject,
    preheader: preheader || undefined,
    sections: sections.map(({ _id, ...rest }) => rest as Section),
  }), [subject, preheader, sections]);

  useEffect(() => {
    (async () => {
      const res = await listBuilderPresets();
      if (res.success && (res.data as any)?.presets) {
        setPresets((res.data as any).presets);
      }
    })();
  }, []);

  useEffect(() => {
    // Keep JSON tab in sync when switching to it
    if (activeTab === "json") setJsonText(toJson(schema));
  }, [activeTab, schema]);

  const handlePreview = async () => {
    const res = await previewMarketingEmail({
      templateKey: "builder",
      params: { schema } as any,
    });
    if (res.success && (res.data as any)?.html) {
      setPreviewHtml((res.data as any).html);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(toJson(schema));
      showSuccessToast("Copied JSON to clipboard");
    } catch {}
  };

  const applyJsonToDesign = () => {
    try {
      const parsed: BuilderSchema = JSON.parse(jsonText);
      setSubject(parsed.subject || "");
      setPreheader(parsed.preheader || "");
      const ui = (parsed.sections || []).map((s) => ({ _id: uuid(), ...(s as Section) }));
      setSections(ui);
      showSuccessToast("Applied JSON to design");
      setActiveTab("design");
    } catch (e: any) {
      showErrorToast(null, e?.message || "Invalid JSON");
    }
  };

  const handleSavePreset = async () => {
    const res = await createBuilderPreset(presetName || "Untitled", schema);
    if (res.success) {
      const list = await listBuilderPresets();
      if (list.success && (list.data as any)?.presets) setPresets((list.data as any).presets);
      setPresetName("");
      showSuccessToast("Preset saved");
    }
  };

  const loadPreset = async (p: { id: string; name: string; schema: any }) => {
    try {
      const s = p.schema as BuilderSchema;
      setSubject(s.subject || "");
      setPreheader(s.preheader || "");
      setSections((s.sections || []).map((sec) => ({ _id: uuid(), ...(sec as Section) })));
      setActiveTab("design");
    } catch {}
  };

  // Native DnD retained; can swap to @dnd-kit later if desired
  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
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
  };

  const addSection = (type: Section["type"]) => {
    const base: any = { _id: uuid(), type };
    if (type === "hero") Object.assign(base, { title: "Hero title", subtitle: "Subtitle", align: "center" });
    if (type === "paragraph") Object.assign(base, { text: "Paragraph text" });
    if (type === "button") Object.assign(base, { cta: { label: "Click me", url: "https://aroosi.app" }, align: "center" });
    if (type === "richParagraph") Object.assign(base, { html: "<p>Rich text paragraph</p>", align: "left" });
    if (type === "image") Object.assign(base, { src: "", alt: "", align: "center", width: 560 });
    if (type === "imageText") Object.assign(base, { image: { src: "", alt: "", width: 280 }, html: "<p>Your content</p>", imagePosition: "left" });
    if (type === "columns") Object.assign(base, { columns: [{ html: "<p>Column 1</p>" }, { html: "<p>Column 2</p>" }], columnCount: 2 });
    if (type === "divider") Object.assign(base, {});
    if (type === "spacer") Object.assign(base, { size: 16 });
    setSections((prev) => [...prev, base]);
  };

  const removeSection = (id: string) => setSections((prev) => prev.filter((s) => s._id !== id));
  const duplicateSection = (id: string) => {
    const src = sections.find((s) => s._id === id);
    if (!src) return;
    const copy = { ...src, _id: uuid() } as UISection;
    const idx = sections.findIndex((s) => s._id === id);
    const next = sections.slice();
    next.splice(idx + 1, 0, copy);
    setSections(next);
  };

  // Field editors per section type
  const updateSection = (id: string, patch: Partial<UISection>) => {
    setSections((prev) => prev.map((s) => (s._id === id ? ({ ...s, ...patch } as UISection) : s)));
  };

  return (
    <>
    <Card className="max-w-6xl">
      <CardHeader>
        <CardTitle>Template Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject + Preheader + actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="builder-subject" className="block text-sm mb-1">Subject</label>
            <Input id="builder-subject" value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Email subject" />
          </div>
          <div>
            <label htmlFor="builder-preheader" className="block text-sm mb-1">Preheader</label>
            <Input id="builder-preheader" value={preheader} onChange={(e)=>setPreheader(e.target.value)} placeholder="Short preview text" />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v)=> setActiveTab(v as any)}>
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="design" className="data-[state=active]:bg-background data-[state=active]:shadow px-3 py-1.5 rounded-md">Design</TabsTrigger>
            <TabsTrigger value="json" className="data-[state=active]:bg-background data-[state=active]:shadow px-3 py-1.5 rounded-md">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-3">
            {/* Add controls */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={()=>addSection("hero")}><Plus className="h-4 w-4 mr-1"/>Hero</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("paragraph")}><Plus className="h-4 w-4 mr-1"/>Paragraph</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("richParagraph")}><Plus className="h-4 w-4 mr-1"/>Rich Paragraph</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("button")}><Plus className="h-4 w-4 mr-1"/>Button</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("image")}><ImageIcon className="h-4 w-4 mr-1"/>Image</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("imageText")}>Image + Text</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("columns")}>Columns</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("divider")}>Divider</Button>
              <Button variant="outline" size="sm" onClick={()=>addSection("spacer")}><Plus className="h-4 w-4 mr-1"/>Spacer</Button>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={handleCopyJson}><Copy className="h-4 w-4 mr-1"/>Copy JSON</Button>
                <Button onClick={handlePreview}>Preview</Button>
              </div>
            </div>

            {/* Sections list */}
            <div className="space-y-2">
              {sections.map((sec) => (
                <div key={sec._id} className="border rounded-md p-3">
                  <div className="text-xs font-medium mb-2">{sec.type}</div>
                  {sec.type === "hero" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`hero-title-${sec._id}`} className="block text-xs mb-1">Title</label>
                        <Input id={`hero-title-${sec._id}`} value={sec.title} onChange={(e)=> updateSection(sec._id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor={`hero-subtitle-${sec._id}`} className="block text-xs mb-1">Subtitle</label>
                        <Input id={`hero-subtitle-${sec._id}`} value={sec.subtitle || ""} onChange={(e)=> updateSection(sec._id, { subtitle: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor={`hero-image-${sec._id}`} className="block text-xs mb-1">Image URL</label>
                        <Input id={`hero-image-${sec._id}`} value={sec.imageUrl || ""} onChange={(e)=> updateSection(sec._id, { imageUrl: e.target.value })} placeholder="https://..." />
                      </div>
                    </div>
                  )}
                  {sec.type === "paragraph" && (
                    <div>
                      <label htmlFor={`para-${sec._id}`} className="block text-xs mb-1">Text</label>
                      <Textarea id={`para-${sec._id}`} value={sec.text} onChange={(e)=> updateSection(sec._id, { text: e.target.value })} rows={4} />
                    </div>
                  )}
                  {sec.type === "button" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor={`btn-label-${sec._id}`} className="block text-xs mb-1">Label</label>
                        <Input id={`btn-label-${sec._id}`} value={sec.cta.label} onChange={(e)=> updateSection(sec._id, { cta: { ...sec.cta, label: e.target.value } })} />
                      </div>
                      <div>
                        <label htmlFor={`btn-url-${sec._id}`} className="block text-xs mb-1">URL</label>
                        <Input id={`btn-url-${sec._id}`} value={sec.cta.url} onChange={(e)=> updateSection(sec._id, { cta: { ...sec.cta, url: e.target.value } })} />
                      </div>
                    </div>
                  )}
                  {sec.type === "image" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label htmlFor={`img-src-${sec._id}`} className="block text-xs mb-1">Image URL</label>
                        <div className="flex gap-2">
                          <Input id={`img-src-${sec._id}`} value={sec.src} onChange={(e)=> updateSection(sec._id, { src: e.target.value })} placeholder="https://..." />
                          <Button type="button" variant="outline" size="sm" onClick={()=> setMediaOpenFor(sec._id)}>
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`img-alt-${sec._id}`} className="block text-xs mb-1">Alt</label>
                        <Input id={`img-alt-${sec._id}`} value={sec.alt || ""} onChange={(e)=> updateSection(sec._id, { alt: e.target.value })} />
                      </div>
                    </div>
                  )}
                  {sec.type === "spacer" && (
                    <div>
                      <label htmlFor={`spacer-${sec._id}`} className="block text-xs mb-1">Height (px)</label>
                      <Input id={`spacer-${sec._id}`} type="number" value={sec.size ?? 16} onChange={(e)=> updateSection(sec._id, { size: parseInt(e.target.value||"0",10) })} />
                    </div>
                  )}
                </div>
              ))}
              {sections.length === 0 && (
                <div className="text-sm text-muted-foreground">No sections yet. Add one to get started.</div>
              )}
            </div>

            {/* Presets */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Presets</div>
              <div className="flex items-center gap-2 mb-2">
                <Input placeholder="Preset name" value={presetName} onChange={(e)=>setPresetName(e.target.value)} />
                <Button variant="outline" onClick={handleSavePreset}><Pencil className="h-4 w-4 mr-1"/>Save Preset</Button>
              </div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {presets.map((p)=> (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="text-sm">{p.name}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={()=> loadPreset(p)}>Load</Button>
                      <Button size="sm" variant="outline" onClick={()=> { setRenamingId(p.id); setRenameValue(p.name); }}>Rename</Button>
                      <Button size="sm" variant="destructive" onClick={async ()=> {
                        await fetch(`/api/admin/email/builder-presets/${p.id}`, { method: 'DELETE' });
                        const list = await fetch('/api/admin/email/builder-presets').then(r=>r.json());
                        if (list?.data?.presets) setPresets(list.data.presets);
                      }}>Delete</Button>
                    </div>
                  </div>
                ))}
                {presets.length===0 && (
                  <div className="text-xs text-muted-foreground">No presets yet.</div>
                )}
              </div>
              {renamingId && (
                <div className="flex items-center gap-2 mt-2">
                  <Input placeholder="New name" value={renameValue} onChange={(e)=> setRenameValue(e.target.value)} />
                  <Button size="sm" onClick={async ()=> {
                    await fetch(`/api/admin/email/builder-presets/${renamingId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: renameValue }),
                    });
                    const list = await fetch('/api/admin/email/builder-presets').then(r=>r.json());
                    if (list?.data?.presets) setPresets(list.data.presets);
                    setRenamingId('');
                    setRenameValue('');
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={()=> { setRenamingId(''); setRenameValue(''); }}>Cancel</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-2">
            <label htmlFor="schema" className="block text-sm mb-1">Builder Schema (JSON)</label>
            <Textarea id="schema" rows={24} value={jsonText} onChange={(e)=> setJsonText(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyJson}><Copy className="h-4 w-4 mr-1"/>Copy JSON</Button>
              <Button onClick={applyJsonToDesign}>Apply JSON</Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Preview */}
        <div>
          <div className="text-sm font-medium mb-1">Live Preview</div>
          {previewHtml ? (
            <iframe title="builder-preview" className="w-full h-[600px] bg-white rounded border" sandbox="allow-same-origin" srcDoc={previewHtml} />
          ) : (
            <div className="text-sm text-muted-foreground">Click Preview to render your email.</div>
          )}
        </div>
      </CardContent>
    </Card>
    {/* Shared media picker dialog */}
    <PexelsImageModal
      isOpen={!!mediaOpenFor}
      onClose={()=> setMediaOpenFor(null)}
      onSelect={(url)=> {
        if (!mediaOpenFor) return;
        const s = sections.find((x)=> x._id === mediaOpenFor);
        if (!s) return;
        if (s.type === "hero") updateSection(s._id, { imageUrl: url } as any);
        else if (s.type === "image") updateSection(s._id, { src: url } as any);
        else if (s.type === "imageText") updateSection(s._id, { image: { ...(s as any).image, src: url } } as any);
        setMediaOpenFor(null);
      }}
    />
    </>
  );
}


