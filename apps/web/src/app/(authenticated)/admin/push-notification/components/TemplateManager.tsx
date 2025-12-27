import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Plus,
  Save,
  Trash2,
  Edit3,
  Copy as CopyIcon,
  Eye,
  Search,
  LayoutTemplate,
} from "lucide-react";

import { TemplateUI } from "../types";

interface TemplateManagerProps {
  // Template state
  templates: TemplateUI[];
  templateSearch: string;
  setTemplateSearch: (value: string) => void;
  selectedTemplate: TemplateUI | null;
  setSelectedTemplate: (template: TemplateUI | null) => void;

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
  handleDeleteTemplate: (template: TemplateUI) => void;
  handleApplyTemplate: (template: TemplateUI) => void;
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
      <Card className="border-0 shadow-lg bg-white h-full flex flex-col">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-purple-500 rounded-xl">
                <LayoutTemplate className="h-5 w-5 text-white" />
              </div>
              Templates
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
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 flex-1 flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 flex-1 min-h-[400px]">
            {templates
              .filter((t) =>
                t.name
                  .toLowerCase()
                  .includes(templateSearch.toLowerCase())
              )
              .map((template) => (
                <div
                  key={template.name}
                  className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md group ${
                    selectedTemplate?.name === template.name
                      ? "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500"
                      : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {template.name}
                        </h3>
                        {template.category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {template.title}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-purple-100 hover:text-purple-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTemplate(template);
                        }}
                        title="Apply template"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-red-100 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            {templates.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <LayoutTemplate className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-600">No templates found</p>
                <p className="text-sm mt-1">
                  Create your first template to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Editor */}
      <Card className="border-0 shadow-lg bg-white h-full">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-slate-100 rounded-xl">
              <Edit3 className="h-5 w-5 text-slate-600" />
            </div>
            {selectedTemplate ? "Edit Template" : "Create Template"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-sm font-semibold text-slate-700">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Welcome Message, Sale Alert"
                className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-title" className="text-sm font-semibold text-slate-700">
                Notification Title
              </Label>
              <Input
                id="template-title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Enter title"
                maxLength={65}
                className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <div className="flex justify-end text-xs text-slate-400">
                {templateTitle.length}/65
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-message" className="text-sm font-semibold text-slate-700">
                Notification Message
              </Label>
              <Textarea
                id="template-message"
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                rows={4}
                className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                placeholder="Enter message"
                maxLength={240}
              />
              <div className="flex justify-end text-xs text-slate-400">
                {templateMessage.length}/240
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-url" className="text-sm font-medium text-slate-700">
                  Action URL
                </Label>
                <Input
                  id="template-url"
                  value={templateUrl}
                  onChange={(e) => setTemplateUrl(e.target.value)}
                  placeholder="https://..."
                  className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-category" className="text-sm font-medium text-slate-700">
                  Category
                </Label>
                <Input
                  id="template-category"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  placeholder="e.g., Marketing"
                  className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-image" className="text-sm font-medium text-slate-700">
                Image URL
              </Label>
              <Input
                id="template-image"
                value={templateImageUrl}
                onChange={(e) => setTemplateImageUrl(e.target.value)}
                placeholder="https://..."
                className="border-slate-200 focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || !templateTitle.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200"
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
                className="border-slate-200 hover:bg-slate-50"
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            )}
          </div>

          {/* Mini Preview */}
          {templateTitle && templateMessage && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quick Preview
                </span>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-3 border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-xs text-white font-bold">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-900">
                        Aroosi
                      </span>
                      <span className="text-[10px] text-slate-400">now</span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 leading-tight mb-1">
                      {templateTitle}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {templateMessage}
                    </p>
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
