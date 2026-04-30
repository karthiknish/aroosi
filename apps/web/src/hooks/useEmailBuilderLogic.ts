import { useState, useCallback, useMemo, useEffect } from "react";
import type { 
  UISection, 
  BuilderSchema, 
  Section 
} from "../app/(authenticated)/admin/marketing-email/builder/types";
import { adminEmailAPI } from "@/lib/api/admin/email";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";
import { renderBuiltTemplate } from "@/lib/templateBuilder";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toJson(schema: BuilderSchema) {
  return JSON.stringify(schema, null, 2);
}

type BuilderPreset = {
  id: string;
  name: string;
  schema: BuilderSchema;
};

export function useEmailBuilderLogic() {
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

  const [activeTab, setActiveTab] = useState<"design" | "json">("design");
  const [jsonText, setJsonText] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [presets, setPresets] = useState<BuilderPreset[]>([]);
  const [presetName, setPresetName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mediaOpenFor, setMediaOpenFor] = useState<string | null>(null);

  const schema: BuilderSchema = useMemo(
    () => ({
      subject,
      preheader: preheader || undefined,
      sections: sections.map(({ _id, ...rest }) => rest as Section),
    }),
    [subject, preheader, sections]
  );

  useEffect(() => {
    (async () => {
      try {
        const presets = await adminEmailAPI.getBuilderPresets();
        if (Array.isArray(presets)) setPresets(presets as BuilderPreset[]);
      } catch {
        setPresets([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === "json") setJsonText(toJson(schema));
  }, [activeTab, schema]);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      setPreviewHtml("");
      const rendered = renderBuiltTemplate(schema);
      const res = await adminEmailAPI.previewMarketingEmail({
        subject: rendered.subject,
        body: rendered.html,
      });
      if (typeof res?.html === "string") {
        setPreviewHtml(res.html);
      } else {
        throw new Error("Preview generation returned no HTML");
      }
    } catch (error) {
      handleError(error, {
        scope: "useEmailBuilderLogic",
        action: "preview_builder_email",
      }, {
        customUserMessage: "Failed to generate preview",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(toJson(schema));
      handleApiOutcome({ success: true, message: "Copied JSON to clipboard" });
    } catch (error) {
      handleError(error, {
        scope: "useEmailBuilderLogic",
        action: "copy_builder_json",
      }, {
        customUserMessage: "Failed to copy JSON to clipboard",
      });
    }
  };

  const applyJsonToDesign = (saveToHistory: () => void) => {
    setIsLoading(true);
    try {
      const parsed: BuilderSchema = JSON.parse(jsonText);
      setSubject(parsed.subject || "");
      setPreheader(parsed.preheader || "");
      const ui = (parsed.sections || []).map((s) => ({
        _id: uuid(),
        ...s,
      }));
      setSections(ui);
      handleApiOutcome({ success: true, message: "Applied JSON to design" });
      setActiveTab("design");
      saveToHistory();
    } catch {
      handleApiOutcome({ warning: "Invalid JSON" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = useCallback(async () => {
    setIsLoading(true);
    try {
      await adminEmailAPI.saveBuilderPreset({
        name: presetName || "Untitled",
        schema,
      });
      const list = await adminEmailAPI.getBuilderPresets();
      if (Array.isArray(list)) setPresets(list);
      setPresetName("");
      handleApiOutcome({ success: true, message: "Preset saved" });
    } catch (error) {
      handleError(error, {
        scope: "useEmailBuilderLogic",
        action: "save_builder_preset",
      }, {
        customUserMessage: "Failed to save preset",
      });
    } finally {
      setIsLoading(false);
    }
  }, [presetName, schema]);

  const loadPreset = useCallback(async (p: BuilderPreset, saveToHistory: () => void) => {
    setIsLoading(true);
    try {
      const s = p.schema;
      setSubject(s.subject || "");
      setPreheader(s.preheader || "");
      setSections(
        (s.sections || []).map((sec) => ({ _id: uuid(), ...sec }))
      );
      setActiveTab("design");
      saveToHistory();
    } catch (error) {
      handleError(error, {
        scope: "useEmailBuilderLogic",
        action: "load_builder_preset",
        presetId: p.id,
      }, {
        customUserMessage: "Failed to load preset",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSection = useCallback((type: Section["type"], saveToHistory: () => void) => {
    const base: Partial<UISection> & { _id: string; type: Section["type"] } = {
      _id: uuid(),
      type,
    };
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
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });
  }, []);

  const removeSection = useCallback((id: string, saveToHistory: () => void) => {
    setSections((prev) => {
      const newSections = prev.filter((s) => s._id !== id);
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });
  }, []);

  const duplicateSection = useCallback((id: string, saveToHistory: () => void) => {
    setSections((prev) => {
      const src = prev.find((s) => s._id === id);
      if (!src) return prev;
      const copy = { ...src, _id: uuid() } as UISection;
      const idx = prev.findIndex((s) => s._id === id);
      const next = prev.slice();
      next.splice(idx + 1, 0, copy);
      setTimeout(() => saveToHistory(), 0);
      return next;
    });
  }, []);

  const updateSection = useCallback((id: string, patch: Partial<UISection>, saveToHistory: () => void) => {
    setSections((prev) => {
      const newSections = prev.map((s) =>
        s._id === id ? ({ ...s, ...patch } as UISection) : s
      );
      setTimeout(() => saveToHistory(), 0);
      return newSections;
    });
  }, []);

  return {
    subject,
    setSubject,
    preheader,
    setPreheader,
    sections,
    setSections,
    activeTab,
    setActiveTab,
    jsonText,
    setJsonText,
    previewHtml,
    setPreviewHtml,
    presets,
    presetName,
    setPresetName,
    isLoading,
    isPreviewLoading,
    mediaOpenFor,
    setMediaOpenFor,
    schema,
    handlePreview,
    handleCopyJson,
    applyJsonToDesign,
    handleSavePreset,
    loadPreset,
    addSection,
    removeSection,
    duplicateSection,
    updateSection,
  };
}
