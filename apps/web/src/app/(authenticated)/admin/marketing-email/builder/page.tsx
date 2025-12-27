"use client";

import React, { useEffect } from "react";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { useEmailBuilderLogic } from "@/hooks/useEmailBuilderLogic";
import { useEmailBuilderHistory } from "@/hooks/useEmailBuilderHistory";
import { useEmailBuilderDnD } from "@/hooks/useEmailBuilderDnD";
import { BuilderHeader } from "./components/BuilderHeader";
import { BuilderSidebar } from "./components/BuilderSidebar";
import { BuilderCanvas } from "./components/BuilderCanvas";

export default function BuilderEmailPage() {
  const {
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
  } = useEmailBuilderLogic();

  const {
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEmailBuilderHistory(
    subject,
    setSubject,
    preheader,
    setPreheader,
    sections,
    setSections
  );

  const {
    dragId,
    draggedOver,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDropOn,
  } = useEmailBuilderDnD(sections, setSections, saveToHistory);

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
  }, [undo, redo, presetName, handleSavePreset]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <BuilderHeader
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          sectionsCount={sections.length}
          isLoading={isLoading}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <BuilderSidebar
            subject={subject}
            setSubject={setSubject}
            preheader={preheader}
            setPreheader={setPreheader}
            presets={presets}
            presetName={presetName}
            setPresetName={setPresetName}
            handleSavePreset={handleSavePreset}
            loadPreset={(p) => loadPreset(p, saveToHistory)}
            addSection={(type) => addSection(type, saveToHistory)}
          />

          <BuilderCanvas
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sections={sections}
            addSection={(type) => addSection(type, saveToHistory)}
            removeSection={(id) => removeSection(id, saveToHistory)}
            duplicateSection={(id) => duplicateSection(id, saveToHistory)}
            updateSection={(id, patch) => updateSection(id, patch, saveToHistory)}
            dragId={dragId}
            draggedOver={draggedOver}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDropOn={onDropOn}
            setMediaOpenFor={setMediaOpenFor}
            jsonText={jsonText}
            setJsonText={setJsonText}
            handleCopyJson={handleCopyJson}
            applyJsonToDesign={() => applyJsonToDesign(saveToHistory)}
            handlePreview={handlePreview}
            isLoading={isLoading}
            isPreviewLoading={isPreviewLoading}
          />
        </div>
      </div>

      <PexelsImageModal
        isOpen={!!mediaOpenFor}
        onClose={() => setMediaOpenFor(null)}
        onSelect={(url) => {
          if (mediaOpenFor) {
            updateSection(mediaOpenFor, { imageUrl: url, src: url } as any, saveToHistory);
            setMediaOpenFor(null);
          }
        }}
      />

      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900">Email Preview</h2>
              <button 
                onClick={() => setPreviewHtml("")}
                className="text-slate-500 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-8">
              <div className="max-w-[600px] mx-auto shadow-sm">
                <iframe 
                  srcDoc={previewHtml} 
                  className="w-full h-full min-h-[800px] border-0 bg-white"
                  title="Email Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
