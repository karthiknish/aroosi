import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Eye } from "lucide-react";
import { SectionEditor } from "../../components/SectionEditor";
import { JSONEditor } from "../../components/JSONEditor";
import { UISection, Section } from "../types";

interface BuilderCanvasProps {
  activeTab: "design" | "json";
  setActiveTab: (v: "design" | "json") => void;
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
  onDropOn: (id: string) => void;
  setMediaOpenFor: (id: string | null) => void;
  jsonText: string;
  setJsonText: (v: string) => void;
  handleCopyJson: () => void;
  applyJsonToDesign: () => void;
  handlePreview: () => void;
  isLoading: boolean;
  isPreviewLoading: boolean;
}

export function BuilderCanvas({
  activeTab,
  setActiveTab,
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
  jsonText,
  setJsonText,
  handleCopyJson,
  applyJsonToDesign,
  handlePreview,
  isLoading,
  isPreviewLoading,
}: BuilderCanvasProps) {
  return (
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
  );
}
