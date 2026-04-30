"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadMessageImage } from "@/lib/api/messages";
import { validateFileSize, compressImage } from "@/lib/utils/imageProcessing";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

interface UseImageComposerProps {
  conversationId?: string;
  fromUserId?: string;
  toUserId?: string;
}

export function useImageComposer({
  conversationId,
  fromUserId,
  toUserId,
}: UseImageComposerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      setError(sizeValidation.message!);
      handleApiOutcome({ warning: sizeValidation.message! });
      return;
    }

    setError(null);
    const isHeicLike = /\.(heic|heif)$/i.test(file.name || "") || file.type === "image/heic";
    
    if (isHeicLike) {
      try {
        setIsConverting(true);
        handleApiOutcome({ success: true, message: "Converting image..." });
        const mod = await import("heic2any");
        const convertHeic = mod.default as (options: {
          blob: Blob;
          toType: string;
          quality: number;
        }) => Promise<Blob | Blob[]>;
        const converted = await convertHeic({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        const convertedBlob = Array.isArray(converted)
          ? converted[0]
          : converted;
        file = new File([convertedBlob], (file.name || "image").replace(/\.(heic|heif)$/i, ".jpg"), {
          type: "image/jpeg",
        });
      } catch (convErr) {
        setError("Couldn't convert HEIC image");
        handleError(convErr, {
          scope: "useImageComposer",
          action: "convert_heic_image",
          conversationId,
          fromUserId,
          toUserId,
        }, {
          customUserMessage: "Couldn't convert HEIC image",
        });
        return;
      } finally {
        setIsConverting(false);
      }
    }

    if (!isHeicLike && (file.size > 2 * 1024 * 1024 || file.type !== "image/jpeg")) {
      try {
        setIsCompressing(true);
        file = await compressImage(file, setCompressionProgress);
      } catch {
        // Continue with original
      } finally {
        setIsCompressing(false);
      }
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setFileName(file.name || "image");

    if (!conversationId || !toUserId || !fromUserId) {
      setError("Missing conversation context");
      handleApiOutcome({ warning: "Missing conversation context" });
      return;
    }

    setIsUploading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const resp = await uploadMessageImage(
        file,
        conversationId,
        fromUserId,
        toUserId,
        controller.signal
      );
      if (!resp.success) throw new Error(resp.error || "Upload failed");
      
      handleApiOutcome({ success: true, message: "Image sent" });
      setPreviewUrl(null);
      setFileName(null);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err?.name !== "AbortError") {
        const message = err?.message || "Failed to send image";
        setError(message);
        handleError(error, {
          scope: "useImageComposer",
          action: "upload_message_image",
          conversationId,
          fromUserId,
          toUserId,
          fileName: file.name,
        }, {
          customUserMessage: message,
        });
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [conversationId, fromUserId, toUserId]);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const removePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [previewUrl]);

  return {
    isUploading,
    isConverting,
    isCompressing,
    compressionProgress,
    error,
    previewUrl,
    fileName,
    inputRef,
    handleFileSelect,
    cancelUpload,
    removePreview,
  };
}
