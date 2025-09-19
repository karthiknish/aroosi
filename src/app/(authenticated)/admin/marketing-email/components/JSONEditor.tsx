"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Upload } from "lucide-react";

interface JSONEditorProps {
  jsonText: string;
  setJsonText: (text: string) => void;
  handleCopyJson: () => void;
  applyJsonToDesign: () => void;
  isLoading: boolean;
}

export function JSONEditor({
  jsonText,
  setJsonText,
  handleCopyJson,
  applyJsonToDesign,
  isLoading,
}: JSONEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">JSON Schema</CardTitle>
        <p className="text-sm text-slate-600">Edit the raw JSON schema for advanced customization</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            rows={24}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="font-mono text-sm"
            placeholder="Enter JSON schema..."
          />
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
              onClick={applyJsonToDesign}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isLoading ? "Applying..." : "Apply JSON"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
