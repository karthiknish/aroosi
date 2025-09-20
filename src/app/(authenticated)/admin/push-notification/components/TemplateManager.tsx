import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Plus,
  Save,
  Trash2,
  Edit3,
  Copy as CopyIcon,
  Eye,
} from "lucide-react";

interface Template {
  name: string;
  title: string;
  message: string;
  imageUrl?: string;
  category?: string;
  url?: string;
  dataJson?: string;
  buttonsJson?: string;
}

interface TemplateManagerProps {
  // Template state
  templates: Template[];
  templateSearch: string;
  setTemplateSearch: (value: string) => void;
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;

  // Form state
  templateName: string;
  setTemplateName: (value: string) => void;
  templateTitle: string;
  setTemplateTitle: (value: string) => void;
  templateMessage: string;
  setTemplateMessage: (value: string) => void;
  templateImageUrl: string;
  setTemplateImageUrl: (value: string) => void;
  templateUrl: string;
  setTemplateUrl: (value: string) => void;
  templateCategory: string;
  setTemplateCategory: (value: string) => void;

  // Action handlers
  handleSaveTemplate: () => void;
  handleDeleteTemplate: (template: Template) => void;
  handleApplyTemplate: (template: Template) => void;
}

export function TemplateManager({
  templates,
  templateSearch,
  setTemplateSearch,
  selectedTemplate,
  setSelectedTemplate,
  templateName,
  setTemplateName,
  templateTitle,
  setTemplateTitle,
  templateMessage,
  setTemplateMessage,
  templateImageUrl,
  setTemplateImageUrl,
  templateUrl,
  setTemplateUrl,
  templateCategory,
  setTemplateCategory,
  handleSaveTemplate,
  handleDeleteTemplate,
  handleApplyTemplate,
}: TemplateManagerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Template List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Notification Templates
            </CardTitle>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateName("");
                setTemplateTitle("");
                setTemplateMessage("");
                setTemplateImageUrl("");
                setTemplateUrl("");
                setTemplateCategory("");
              }}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <Input
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="Search templates..."
            className="max-w-sm"
          />

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
            {templates
              .filter((t) =>
                t.name
                  .toLowerCase()
                  .includes(templateSearch.toLowerCase())
              )
              .map((template) => (
                <div
                  key={template.name}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.name === template.name
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTemplate(template);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select template: ${template.name}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.title}
                      </p>
                      {template.category && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTemplate(template);
                        }}
                        title="Apply template"
                      >
                        <CopyIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        title="Delete template"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Copy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No templates found</p>
                <p className="text-xs mt-1">
                  Create your first template to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {selectedTemplate ? "Edit Template" : "Create Template"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name" className="text-sm font-medium">
              Template Name
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Welcome Message, Sale Alert"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="template-title"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Notification title"
              maxLength={65}
            />
            <div className="text-xs text-gray-500">
              {templateTitle.length}/65 characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-message" className="text-sm font-medium">
              Message
            </Label>
            <textarea
              id="template-message"
              value={templateMessage}
              onChange={(e) => setTemplateMessage(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Notification message"
              maxLength={240}
            />
            <div className="text-xs text-gray-500">
              {templateMessage.length}/240 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-url" className="text-sm font-medium">
                Action URL (Optional)
              </Label>
              <Input
                id="template-url"
                value={templateUrl}
                onChange={(e) => setTemplateUrl(e.target.value)}
                placeholder="https://aroosi.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category" className="text-sm font-medium">
                Category (Optional)
              </Label>
              <Input
                id="template-category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="e.g., Marketing, Updates"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-image" className="text-sm font-medium">
              Image URL (Optional)
            </Label>
            <Input
              id="template-image"
              value={templateImageUrl}
              onChange={(e) => setTemplateImageUrl(e.target.value)}
              placeholder="https://aroosi.com/images/..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || !templateTitle.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Save className="h-4 w-4 mr-2" />
              {selectedTemplate ? "Update Template" : "Save Template"}
            </Button>
            {selectedTemplate && (
              <Button
                variant="outline"
                onClick={() => {
                  const newTemplate = { ...selectedTemplate };
                  newTemplate.name = `${newTemplate.name} Copy`;
                  setSelectedTemplate(newTemplate);
                  setTemplateName(`${templateName} Copy`);
                }}
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            )}
          </div>

          {/* Template Preview */}
          {templateTitle && templateMessage && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  Preview
                </span>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white font-bold">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        Aroosi
                      </span>
                      <span className="text-xs text-gray-500">now</span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 leading-tight mb-1">
                      {templateTitle}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {templateMessage}
                    </p>
                    {templateImageUrl && (
                      <div className="mt-2 rounded bg-gray-100 h-12 flex items-center justify-center text-xs text-gray-500">
                        🖼️ Image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
