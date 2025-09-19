"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface TemplatePreviewProps {
  previewHtml: string;
  isPreviewLoading: boolean;
  handlePreview: () => void;
}

export function TemplatePreview({
  previewHtml,
  isPreviewLoading,
  handlePreview,
}: TemplatePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <p className="text-sm text-slate-600">See how your email will look to recipients</p>
          </div>
          <Button
            onClick={handlePreview}
            disabled={isPreviewLoading}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isPreviewLoading ? "Loading..." : "Refresh Preview"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {previewHtml ? (
          <div className="border rounded-lg overflow-hidden">
            <iframe
              title="email-preview"
              className="w-full h-[600px] bg-white"
              sandbox="allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Eye className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No preview yet</h3>
            <p className="text-slate-600 mb-4">Click &quot;Refresh Preview&quot; to see how your email will look</p>
            <Button onClick={handlePreview} disabled={isPreviewLoading}>
              {isPreviewLoading ? "Loading..." : "Generate Preview"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
