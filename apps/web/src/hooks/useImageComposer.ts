"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadMessageImage } from "@/lib/api/messages";
import { validateFileSize, compressImage } from "@/lib/utils/imageProcessing";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

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
      showErrorToast(null, sizeValidation.message!);
      return;
    }

    setError(null);
    const isHeicLike = /\.(heic|heif)$/i.test(file.name || "") || file.type === "image/heic";
    
    if (isHeicLike) {
      try {
        setIsConverting(true);
        showSuccessToast("Converting image…");
        const mod: any = await import("heic2any");
        const convertedBlob: Blob = await mod.default({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        file = new File([convertedBlob], (file.name || "image").replace(/\.(heic|heif)$/i, ".jpg"), {
          type: "image/jpeg",
        });
      } catch (convErr) {
        setError("Couldn't convert HEIC image");
        return;
      } finally {
        setIsConverting(false);
      }
    }

    if (!isHeicLike && (file.size > 2 * 1024 * 1024 || file.type !== "image/jpeg")) {
      try {
        setIsCompressing(true);
        file = await compressImage(file, setCompressionProgress);
      } catch (compErr) {
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
      
      showSuccessToast("Image sent");
      setPreviewUrl(null);
      setFileName(null);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err.message || "Failed to send image");
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [conversationId, fromUserId, toUserId, previewUrl]);

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
