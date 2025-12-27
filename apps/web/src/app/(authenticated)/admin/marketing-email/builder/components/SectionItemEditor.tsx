import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { UISection } from "../types";

interface SectionItemEditorProps {
  sec: UISection;
  updateSection: (id: string, patch: Partial<UISection>) => void;
  setMediaOpenFor: (id: string | null) => void;
}

export function SectionItemEditor({
  sec,
  updateSection,
  setMediaOpenFor,
}: SectionItemEditorProps) {
  if (sec.type === "hero") {
    return (
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
              onChange={(e) => updateSection(sec._id, { title: e.target.value })}
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
                updateSection(sec._id, { subtitle: e.target.value })
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
                updateSection(sec._id, { imageUrl: e.target.value })
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
    );
  }

  if (sec.type === "paragraph") {
    return (
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
          onChange={(e) => updateSection(sec._id, { text: e.target.value })}
          rows={4}
          placeholder="Enter your paragraph text..."
        />
      </div>
    );
  }

  if (sec.type === "button") {
    return (
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
                  cta: { ...sec.cta, label: e.target.value },
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
                  cta: { ...sec.cta, url: e.target.value },
                })
              }
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>
    );
  }

  if (sec.type === "image") {
    return (
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
            <label
              htmlFor={`image-alt-${sec._id}`}
              className="block text-sm font-medium text-slate-700 mb-1"
            >
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
    );
  }

  if (sec.type === "spacer") {
    return (
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
              size: parseInt(e.target.value || "0", 10),
            })
          }
          min="1"
          max="200"
        />
      </div>
    );
  }

  // Handle other types as simple HTML placeholders if needed, or expand as required
  if (sec.type === "richParagraph" || sec.type === "imageText" || sec.type === "columns") {
     return (
       <div className="p-4 bg-neutral/5 rounded border border-dashed border-neutral/20 text-neutral-light text-sm italic">
          {sec.type} editor is currently handled via JSON mode or needs further UI implementation.
       </div>
     );
  }

  return null;
}
