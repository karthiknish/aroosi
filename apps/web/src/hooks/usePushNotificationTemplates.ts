import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import type { TemplateUI, PushNotificationTemplate } from "../app/(authenticated)/admin/push-notification/types";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export function usePushNotificationTemplates() {
  const queryClient = useQueryClient();
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateUI | null>(null);

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["admin", "push", "templates", templateSearch],
    queryFn: () => adminPushAPI.getTemplates(templateSearch),
  });

  const templates = useMemo<TemplateUI[]>(() => {
    const items = (templatesData || []) as PushNotificationTemplate[];
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      title: getString(item.payload?.title) || "",
      message: getString(item.payload?.message) || "",
      imageUrl: getString(item.payload?.imageUrl),
      category: getString(item.payload?.category),
      url: getString(item.payload?.url),
      dataJson: item.payload?.data ? JSON.stringify(item.payload.data, null, 2) : undefined,
      buttonsJson: item.payload?.buttons ? JSON.stringify(item.payload.buttons, null, 2) : undefined,
    }));
  }, [templatesData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminPushAPI.deleteTemplate(id),
    onSuccess: () => {
      handleApiOutcome({
        success: true,
        message: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "push", "templates"] });
    },
    onError: (error: unknown) => {
      handleError(error, {
        scope: "usePushNotificationTemplates",
        action: "delete_template",
      }, {
        customUserMessage: "Failed to delete template",
      });
    },
  });

  const deleteTemplate = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    deleteMutation.mutate(id);
  };

  return {
    templates,
    templatesLoading,
    newTemplateName,
    setNewTemplateName,
    newTemplateDesc,
    setNewTemplateDesc,
    templateSearch,
    setTemplateSearch,
    selectedTemplate,
    setSelectedTemplate,
    loadTemplates: () => queryClient.invalidateQueries({ queryKey: ["admin", "push", "templates"] }),
    deleteTemplate,
  };
}
