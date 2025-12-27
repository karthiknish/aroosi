import { useState, useEffect, useCallback } from "react";
import { TemplateUI, PushNotificationTemplate } from "../app/(authenticated)/admin/push-notification/types";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function usePushNotificationTemplates() {
  const [templates, setTemplates] = useState<TemplateUI[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateUI | null>(null);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/push-notification/templates");
      const json = await res.json();
      const items = (json?.data?.items || []) as PushNotificationTemplate[];
      
      // Map to TemplateUI
      const uiItems: TemplateUI[] = items.map(item => ({
        id: item.id,
        name: item.name,
        title: item.payload?.title || "",
        message: item.payload?.message || "",
        imageUrl: item.payload?.imageUrl,
        category: item.payload?.category,
        url: item.payload?.url,
        dataJson: item.payload?.data ? JSON.stringify(item.payload.data, null, 2) : undefined,
        buttonsJson: item.payload?.buttons ? JSON.stringify(item.payload.buttons, null, 2) : undefined,
      }));
      
      setTemplates(uiItems);
    } catch (e) {
      console.error(e);
      showErrorToast(null, "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/admin/push-notification/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      showSuccessToast("Template deleted successfully");
      loadTemplates();
    } catch (_e) {
      console.error(_e);
      showErrorToast(null, "Failed to delete template");
    }
  }, [loadTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    setTemplates,
    templatesLoading,
    newTemplateName,
    setNewTemplateName,
    newTemplateDesc,
    setNewTemplateDesc,
    templateSearch,
    setTemplateSearch,
    selectedTemplate,
    setSelectedTemplate,
    loadTemplates,
    deleteTemplate,
  };
}
