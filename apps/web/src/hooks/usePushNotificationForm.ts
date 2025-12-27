import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import { FilterItem } from "../app/(authenticated)/admin/push-notification/types";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function usePushNotificationForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dataJson, setDataJson] = useState('{\n  "type": "system_notification"\n}');
  const [buttonsJson, setButtonsJson] = useState('[\n  { "id": "view", "text": "View" }\n]');
  const [dryRun, setDryRun] = useState(true);
  const [segments, setSegments] = useState<string[]>(["Subscribed Users"]);
  const [excludedSegments, setExcludedSegments] = useState<string[]>([]);
  const [maxAudience, setMaxAudience] = useState<number>(100000);
  const [confirmLive, setConfirmLive] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Re-engagement");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [delayedOption, setDelayedOption] = useState<"immediate" | "timezone" | "last-active">("immediate");
  const [deliveryTimeOfDay, setDeliveryTimeOfDay] = useState("");
  const [throttlePerMinute, setThrottlePerMinute] = useState<number>(0);
  const [androidChannelId, setAndroidChannelId] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "custom">("normal");
  const [customPriority, setCustomPriority] = useState<number>(5);
  const [ttl, setTtl] = useState<number>(0);
  const [collapseId, setCollapseId] = useState("");
  const [iosBadgeType, setIosBadgeType] = useState<"None" | "SetTo" | "Increase">("None");
  const [iosBadgeCount, setIosBadgeCount] = useState<number>(0);
  const [iosSound, setIosSound] = useState("");
  const [androidSound, setAndroidSound] = useState("");
  const [iosInterruptionLevel, setIosInterruptionLevel] = useState<"active" | "passive" | "time-sensitive" | "critical" | "">("");
  const [mutableContent, setMutableContent] = useState(false);
  const [contentAvailable, setContentAvailable] = useState(false);
  const [includePlayerIds, setIncludePlayerIds] = useState<string>("");
  const [includeExternalUserIds, setIncludeExternalUserIds] = useState<string>("");
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);

  const safeParseJSON = (text: string): any => {
    try {
      const t = (text || "").trim();
      if (!t) return undefined;
      return JSON.parse(t);
    } catch {
      showErrorToast(null, "Invalid JSON in custom data/buttons");
      return undefined;
    }
  };

  const sendMutation = useMutation({
    mutationFn: (payload: any) => adminPushAPI.send(payload),
    onSuccess: (result) => {
      if (dryRun) {
        setPreviewData(result);
        showSuccessToast("Preview generated successfully");
      } else {
        showSuccessToast("Push notification sent successfully");
        // Reset form
        setTitle("");
        setMessage("");
        setUrl("");
        setImageUrl("");
        setConfirmLive(false);
        setAppliedTemplateId(null);
      }
    },
    onError: (error: any) => {
      showErrorToast(error, `Failed to ${dryRun ? "preview" : "send"} notification`);
    },
  });

  const handleSend = useCallback(async () => {
    if (!title.trim() || !message.trim()) return;
    if (!dryRun && !confirmLive) return;

    const payload: any = {
      title: title.trim(),
      message: message.trim(),
      url: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      dryRun,
      confirm: !dryRun && confirmLive,
      audience: segments,
      excludedSegments,
      includePlayerIds: includePlayerIds
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      includeExternalUserIds: includeExternalUserIds
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      data: safeParseJSON(dataJson),
      buttons: safeParseJSON(buttonsJson),
      filters: filters.length ? filters : undefined,
      maxAudience,
      delayedOption,
      sendAfter: isScheduled ? scheduledTime : undefined,
      deliveryTimeOfDay: delayedOption === "timezone" ? deliveryTimeOfDay : undefined,
      throttlePerMinute: throttlePerMinute || undefined,
      androidChannelId: androidChannelId || undefined,
      priority: priority === "custom" ? customPriority : priority === "high" ? "high" : "normal",
      ttl: ttl || undefined,
      collapseId: collapseId || undefined,
      iosBadgeType: iosBadgeType !== "None" ? iosBadgeType : undefined,
      iosBadgeCount: iosBadgeType !== "None" && iosBadgeCount ? iosBadgeCount : undefined,
      iosSound: iosSound || undefined,
      androidSound: androidSound || undefined,
      iosInterruptionLevel: iosInterruptionLevel || undefined,
      mutableContent,
      contentAvailable,
    };

    if (!dryRun && appliedTemplateId) {
      payload.templateId = appliedTemplateId;
    }

    sendMutation.mutate(payload);
  }, [
    title, message, url, imageUrl, dryRun, confirmLive, segments, excludedSegments,
    includePlayerIds, includeExternalUserIds, dataJson, buttonsJson, filters,
    maxAudience, delayedOption, isScheduled, scheduledTime, deliveryTimeOfDay,
    throttlePerMinute, androidChannelId, priority, customPriority, ttl, collapseId,
    iosBadgeType, iosBadgeCount, iosSound, androidSound, iosInterruptionLevel,
    mutableContent, contentAvailable, appliedTemplateId, sendMutation
  ]);

  const applyTemplate = useCallback((tpl: any) => {
    try {
      const p = tpl?.payload || {};
      setTitle(p.title || "");
      setMessage(p.message || "");
      setUrl(p.url || "");
      setImageUrl(p.imageUrl || "");
      setSegments(Array.isArray(p.audience) ? p.audience : ["Subscribed Users"]);
      setExcludedSegments(Array.isArray(p.excludedSegments) ? p.excludedSegments : []);
      setIncludePlayerIds((p.includePlayerIds || []).join(", "));
      setIncludeExternalUserIds((p.includeExternalUserIds || []).join(", "));
      setDataJson(p.data ? JSON.stringify(p.data, null, 2) : '{\n  "type": "system_notification"\n}');
      setButtonsJson(p.buttons ? JSON.stringify(p.buttons, null, 2) : '[\n  { "id": "view", "text": "View" }\n]');
      setAndroidChannelId(p.androidChannelId || "");
      if (typeof p.priority === "number") {
        setPriority("custom");
        setCustomPriority(p.priority);
      } else if (p.priority === "high") {
        setPriority("high");
      } else {
        setPriority("normal");
      }
      setTtl(p.ttl || 0);
      setCollapseId(p.collapseId || "");
      setIosBadgeType((p.iosBadgeType as any) || "None");
      setIosBadgeCount(p.iosBadgeCount || 0);
      setIosSound(p.iosSound || "");
      setAndroidSound(p.androidSound || "");
      setIosInterruptionLevel((p.iosInterruptionLevel as any) || "");
      setMutableContent(!!p.mutableContent);
      setContentAvailable(!!p.contentAvailable);
      setDelayedOption((p.delayedOption as any) || "immediate");
      setScheduledTime(p.sendAfter || "");
      setIsScheduled(!!p.sendAfter);
      setDeliveryTimeOfDay(p.deliveryTimeOfDay || "");
      setThrottlePerMinute(p.throttlePerMinute || 0);
      setFilters(Array.isArray(p.filters) ? p.filters : []);
      setAppliedTemplateId(tpl?.id || null);
      showSuccessToast("Template applied");
    } catch (_e) {
      console.error(_e);
      showErrorToast(null, "Failed to apply template");
    }
  }, []);

  const saveTemplateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; payload: any }) => adminPushAPI.createTemplate(data),
    onSuccess: () => {
      showSuccessToast("Template saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "push", "templates"] });
    },
    onError: (error: any) => {
      showErrorToast(error, "Failed to save template");
    },
  });

  const saveCurrentAsTemplate = useCallback(async (name: string, description: string) => {
    if (!name.trim()) {
      showErrorToast(null, "Template name required");
      return;
    }
    const payload: any = {
      title: title.trim(),
      message: message.trim(),
      url: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      audience: segments,
      excludedSegments,
      includePlayerIds: includePlayerIds.split(/[\,\s]+/).map((s) => s.trim()).filter(Boolean),
      includeExternalUserIds: includeExternalUserIds.split(/[\,\s]+/).map((s) => s.trim()).filter(Boolean),
      data: safeParseJSON(dataJson),
      buttons: safeParseJSON(buttonsJson),
      androidChannelId: androidChannelId || undefined,
      priority: priority === "custom" ? customPriority : priority === "high" ? "high" : "normal",
      ttl: ttl || undefined,
      collapseId: collapseId || undefined,
      iosBadgeType: iosBadgeType !== "None" ? iosBadgeType : undefined,
      iosBadgeCount: iosBadgeType !== "None" && iosBadgeCount ? iosBadgeCount : undefined,
      iosSound: iosSound || undefined,
      androidSound: androidSound || undefined,
      iosInterruptionLevel: iosInterruptionLevel || undefined,
      mutableContent,
      contentAvailable,
      delayedOption,
      sendAfter: isScheduled ? scheduledTime : undefined,
      deliveryTimeOfDay: delayedOption === "timezone" ? deliveryTimeOfDay : undefined,
      throttlePerMinute: throttlePerMinute || undefined,
      filters: filters.length ? filters : undefined,
    };
    
    saveTemplateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      payload,
    });
  }, [
    title, message, url, imageUrl, segments, excludedSegments, includePlayerIds,
    includeExternalUserIds, dataJson, buttonsJson, androidChannelId, priority,
    customPriority, ttl, collapseId, iosBadgeType, iosBadgeCount, iosSound,
    androidSound, iosInterruptionLevel, mutableContent, contentAvailable,
    delayedOption, isScheduled, scheduledTime, deliveryTimeOfDay, throttlePerMinute, filters,
    saveTemplateMutation
  ]);

  return {
    title, setTitle,
    message, setMessage,
    url, setUrl,
    imageUrl, setImageUrl,
    dataJson, setDataJson,
    buttonsJson, setButtonsJson,
    sending: sendMutation.isPending,
    dryRun, setDryRun,
    segments, setSegments,
    excludedSegments, setExcludedSegments,
    maxAudience, setMaxAudience,
    confirmLive, setConfirmLive,
    selectedCategory, setSelectedCategory,
    scheduledTime, setScheduledTime,
    isScheduled, setIsScheduled,
    delayedOption, setDelayedOption,
    deliveryTimeOfDay, setDeliveryTimeOfDay,
    throttlePerMinute, setThrottlePerMinute,
    androidChannelId, setAndroidChannelId,
    priority, setPriority,
    customPriority, setCustomPriority,
    ttl, setTtl,
    collapseId, setCollapseId,
    iosBadgeType, setIosBadgeType,
    iosBadgeCount, setIosBadgeCount,
    iosSound, setIosSound,
    androidSound, setAndroidSound,
    iosInterruptionLevel, setIosInterruptionLevel,
    mutableContent, setMutableContent,
    contentAvailable, setContentAvailable,
    includePlayerIds, setIncludePlayerIds,
    includeExternalUserIds, setIncludeExternalUserIds,
    appliedTemplateId, setAppliedTemplateId,
    filters, setFilters,
    previewData, setPreviewData,
    handleSend,
    applyTemplate,
    saveCurrentAsTemplate,
  };
}
