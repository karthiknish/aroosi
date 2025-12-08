"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Eye, Pencil, Trash2, X, CheckCircle } from "lucide-react";

type BuilderSchema = { subject: string; preheader?: string; sections: Section[] };
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

interface PresetManagerProps {
  presets: Array<{ id: string; name: string; schema: any }>;
  presetName: string;
  setPresetName: (name: string) => void;
  handleSavePreset: () => void;
  loadPreset: (preset: { id: string; name: string; schema: any }) => void;
}

export function PresetManager({
  presets,
  presetName,
  setPresetName,
  handleSavePreset,
  loadPreset,
}: PresetManagerProps) {
  const [renamingId, setRenamingId] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");

  const handleRename = async (presetId: string, newName: string) => {
    await fetch(`/api/admin/email/builder-presets/${presetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    // Refresh presets would be handled by parent component
    setRenamingId('');
    setRenameValue('');
  };

  const handleDelete = async (presetId: string) => {
    await fetch(`/api/admin/email/builder-presets/${presetId}`, { method: 'DELETE' });
    // Refresh presets would be handled by parent component
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Save className="h-5 w-5" />
          Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Template name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{preset.name}</p>
                <p className="text-xs text-slate-500">Template</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadPreset(preset)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRenamingId(preset.id);
                    setRenameValue(preset.name);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(preset.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {presets.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No saved templates yet</p>
          )}
        </div>

        {renamingId && (
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Input
              placeholder="New name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => handleRename(renamingId, renameValue)}
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRenamingId('');
                setRenameValue('');
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
