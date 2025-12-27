import React from "react";
import { EmailSettings } from "../../components/EmailSettings";
import { AddSections } from "../../components/AddSections";
import { PresetManager } from "../../components/PresetManager";
import { Section } from "../types";

interface BuilderSidebarProps {
  subject: string;
  setSubject: (v: string) => void;
  preheader: string;
  setPreheader: (v: string) => void;
  presets: any[];
  presetName: string;
  setPresetName: (v: string) => void;
  handleSavePreset: () => void;
  loadPreset: (p: any) => void;
  addSection: (type: Section["type"]) => void;
}

export function BuilderSidebar({
  subject,
  setSubject,
  preheader,
  setPreheader,
  presets,
  presetName,
  setPresetName,
  handleSavePreset,
  loadPreset,
  addSection,
}: BuilderSidebarProps) {
  return (
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
    </div>
  );
}
