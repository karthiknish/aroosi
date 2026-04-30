import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import type { FilterItem } from "../app/(authenticated)/admin/push-notification/types";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

type ParsedJson = Record<string, unknown> | Array<Record<string, unknown>> | undefined;

type PushTemplatePayload = {
  title?: string;
  message?: string;
  url?: string;
  imageUrl?: string;
  category?: string;
  audience?: string[];
  excludedSegments?: string[];
  includePlayerIds?: string[];
  includeExternalUserIds?: string[];
  data?: ParsedJson;
  buttons?: ParsedJson;
  androidChannelId?: string;
  priority?: "normal" | "high" | number;
  ttl?: number;
  collapseId?: string;
  iosBadgeType?: "None" | "SetTo" | "Increase";
  iosBadgeCount?: number;
  iosSound?: string;
  androidSound?: string;
  iosInterruptionLevel?: "active" | "passive" | "time-sensitive" | "critical" | "";
  mutableContent?: boolean;
  contentAvailable?: boolean;
  delayedOption?: "immediate" | "timezone" | "last-active";
  sendAfter?: string;
  deliveryTimeOfDay?: string;
  throttlePerMinute?: number;
  filters?: FilterItem[];
};

type PushSendPayload = PushTemplatePayload & {
  title: string;
  message: string;
  dryRun: boolean;
  confirm: boolean;
  templateId?: string;
  maxAudience: number;
};

type AppliedTemplate = {
  id?: string | null;
  payload?: PushTemplatePayload;
  title?: string;
  message?: string;
  url?: string;
  imageUrl?: string;
  dataJson?: string;
  buttonsJson?: string;
  category?: string;
};

const INVALID_JSON = Symbol("INVALID_JSON");

type ParsedJsonResult = ParsedJson | typeof INVALID_JSON;

function safeParseJSON(text: string): ParsedJsonResult {
  try {
    const t = (text || "").trim();
    if (!t) return undefined;
    return JSON.parse(t) as ParsedJson;
  } catch {
    handleApiOutcome({ warning: "Invalid JSON in custom data/buttons" });
    return INVALID_JSON;
  }
}

function parseJsonFields(
  dataJson: string,
  buttonsJson: string
): { data: ParsedJson; buttons: ParsedJson } | null {
  const data = safeParseJSON(dataJson);
  const buttons = safeParseJSON(buttonsJson);

  if (data === INVALID_JSON || buttons === INVALID_JSON) {
    return null;
  }

  return {
    data,
    buttons,
  };
}

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
  const [previewData, setPreviewData] = useState<unknown>(null);

  const sendMutation = useMutation({
    mutationFn: (payload: PushSendPayload) => adminPushAPI.send(payload),
    onSuccess: (result) => {
      if (dryRun) {
        setPreviewData(result);
        handleApiOutcome({
          success: true,
          message: "Preview generated successfully",
        });
      } else {
        handleApiOutcome({
          success: true,
          message: "Push notification sent successfully",
        });
        // Reset form
        setTitle("");
        setMessage("");
        setUrl("");
        setImageUrl("");
        setConfirmLive(false);
        setAppliedTemplateId(null);
      }
    },
    onError: (error: unknown) => {
      handleError(error, {
        scope: "usePushNotificationForm",
        action: dryRun ? "preview_push_notification" : "send_push_notification",
      }, {
        customUserMessage: `Failed to ${dryRun ? "preview" : "send"} notification`,
      });
    },
  });

  const handleSend = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      handleApiOutcome({ warning: "Title and message are required" });
      return;
    }
    if (!dryRun && !confirmLive) {
      handleApiOutcome({ warning: "Confirmation required for live send" });
      return;
    }

    const parsedJson = parseJsonFields(dataJson, buttonsJson);
    if (!parsedJson) {
      return;
    }

    const payload: PushSendPayload = {
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
      data: parsedJson.data,
      buttons: parsedJson.buttons,
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

  const applyTemplate = useCallback((tpl: AppliedTemplate) => {
    try {
      const parsedJson = parseJsonFields(
        tpl?.dataJson || "",
        tpl?.buttonsJson || ""
      );
      if ((tpl?.dataJson || tpl?.buttonsJson) && !parsedJson) {
        throw new Error("Template contains invalid JSON fields");
      }

      const p: PushTemplatePayload = tpl?.payload || {
        title: tpl?.title,
        message: tpl?.message,
        url: tpl?.url,
        imageUrl: tpl?.imageUrl,
        data: parsedJson?.data,
        buttons: parsedJson?.buttons,
        category: tpl?.category,
      };
      setTitle(p.title || "");
      setMessage(p.message || "");
      setUrl(p.url || "");
      setImageUrl(p.imageUrl || "");
      setSelectedCategory(p.category || tpl?.category || "Re-engagement");
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
      setIosBadgeType(p.iosBadgeType || "None");
      setIosBadgeCount(p.iosBadgeCount || 0);
      setIosSound(p.iosSound || "");
      setAndroidSound(p.androidSound || "");
      setIosInterruptionLevel(p.iosInterruptionLevel || "");
      setMutableContent(!!p.mutableContent);
      setContentAvailable(!!p.contentAvailable);
      setDelayedOption(p.delayedOption || "immediate");
      setScheduledTime(p.sendAfter || "");
      setIsScheduled(!!p.sendAfter);
      setDeliveryTimeOfDay(p.deliveryTimeOfDay || "");
      setThrottlePerMinute(p.throttlePerMinute || 0);
      setFilters(Array.isArray(p.filters) ? p.filters : []);
      setAppliedTemplateId(tpl?.id || null);
      handleApiOutcome({ success: true, message: "Template applied" });
    } catch (error) {
      console.error(error);
      handleError(error, {
        scope: "usePushNotificationForm",
        action: "apply_template",
        templateId: tpl?.id || null,
      }, {
        customUserMessage: "Failed to apply template",
      });
    }
  }, []);

  const saveTemplateMutation = useMutation({
    mutationFn: (data: { templateId?: string; name: string; description?: string; payload: PushTemplatePayload }) =>
      data.templateId
        ? adminPushAPI.updateTemplate(data.templateId, {
            name: data.name,
            description: data.description,
            payload: data.payload,
          })
        : adminPushAPI.createTemplate({
            name: data.name,
            description: data.description,
            payload: data.payload,
          }),
    onSuccess: (_result, variables) => {
        handleApiOutcome({
          success: true,
          message: variables.templateId ? "Template updated" : "Template saved",
        });
      queryClient.invalidateQueries({ queryKey: ["admin", "push", "templates"] });
    },
    onError: (error: unknown) => {
        handleError(error, {
          scope: "usePushNotificationForm",
          action: "save_push_template",
        }, {
          customUserMessage: "Failed to save template",
        });
    },
  });

  const saveCurrentAsTemplate = useCallback(async (name: string, description: string, templateId?: string | null) => {
    if (!name.trim()) {
        handleApiOutcome({ warning: "Template name required" });
        return;
      }

      const parsedJson = parseJsonFields(dataJson, buttonsJson);
      if (!parsedJson) {
      return;
    }
    const payload: PushTemplatePayload = {
      title: title.trim(),
      message: message.trim(),
      url: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      audience: segments,
      excludedSegments,
      includePlayerIds: includePlayerIds.split(/[\,\s]+/).map((s) => s.trim()).filter(Boolean),
      includeExternalUserIds: includeExternalUserIds.split(/[\,\s]+/).map((s) => s.trim()).filter(Boolean),
      data: parsedJson.data,
      buttons: parsedJson.buttons,
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
      templateId: templateId || undefined,
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
