import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import { TemplateUI, PushNotificationTemplate } from "../app/(authenticated)/admin/push-notification/types";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

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
      title: item.payload?.title || "",
      message: item.payload?.message || "",
      imageUrl: item.payload?.imageUrl,
      category: item.payload?.category,
      url: item.payload?.url,
      dataJson: item.payload?.data ? JSON.stringify(item.payload.data, null, 2) : undefined,
      buttonsJson: item.payload?.buttons ? JSON.stringify(item.payload.buttons, null, 2) : undefined,
    }));
  }, [templatesData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminPushAPI.deleteTemplate(id),
    onSuccess: () => {
      showSuccessToast("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "push", "templates"] });
    },
    onError: (error: any) => {
      showErrorToast(error, "Failed to delete template");
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
