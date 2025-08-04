import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { showErrorToast } from "@/lib/ui/toast";
import type { ImageType } from "@/types/image";
import { computeFileHash, DuplicateSession, sanitizeDisplayName } from "@/lib/utils/imageUploadHelpers";

interface LocalImageUploadProps {
  onImagesChanged: (imageFiles: (string | ImageType)[]) => void;
  maxImages?: number;
  className?: string;
}

type LocalImageItem = {
  localId: string; // stable temp id derived from file metadata hash
  file: File;
  previewUrl: string;
};

export function LocalImageUpload({
  onImagesChanged,
  maxImages = 5,
  className = "",
}: LocalImageUploadProps) {
  const [items, setItems] = useState<LocalImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimum dimensions to accept (client-side)
  const MIN_WIDTH = 512;
  const MIN_HEIGHT = 512;

  // Utility: read an image file and return its dimensions without leaking object URLs
  const getImageDimensions = useCallback(async (file: File): Promise<{ width: number; height: number } | null> => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      // Prefer createImageBitmap for performance if available
      if (typeof (globalThis as any).createImageBitmap === "function") {
        const bitmap: ImageBitmap = await (globalThis as any).createImageBitmap(file);
        const dims = { width: bitmap.width, height: bitmap.height };
        if (typeof (bitmap as any).close === "function") {
          try {
            (bitmap as any).close();
          } catch {}
        }
        return dims;
      }
      // Fallback to HTMLImageElement
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = document.createElement("img");
        img.onload = () =>
          resolve({
            width: (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width,
            height: (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height,
          });
        img.onerror = () => reject(new Error("Failed to load image for dimension check"));
        img.src = objectUrl as string;
      });
      return dims;
    } catch (e) {
      console.warn("Failed to inspect image dimensions", e);
      return null;
    } finally {
      if (objectUrl && objectUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    }
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      try {
        items.forEach((it) => {
          if (it.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(it.previewUrl);
        });
      } catch {}
    };
  }, [items]);

  const emitChange = useCallback(
    (nextItems: LocalImageItem[]) => {
      const imageTypeObjects: ImageType[] = nextItems.map((it) => ({
        id: it.localId,
        _id: it.localId,
        url: it.previewUrl,
        // Sanitize UI-facing names only; underlying upload uses File object
        fileName: sanitizeDisplayName(it.file.name),
        name: sanitizeDisplayName(it.file.name),
        size: it.file.size,
        storageId: "",
        uploadedAt: Date.now(),
      }));
      onImagesChanged(imageTypeObjects);
    },
    [onImagesChanged],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsLoading(true);
      setUploadError(null);

      try {
        const remainingSlots = Math.max(0, maxImages - items.length);
        const filesToAdd = acceptedFiles.slice(0, remainingSlots);

        if (acceptedFiles.length > remainingSlots) {
          showErrorToast(
            null,
            `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}`,
          );
        }

        // Validate size and minimum dimensions before creating any object URLs
        const sizeValidFiles = filesToAdd.filter((file) => {
          const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
          if (!isValidSize) {
            setUploadError("Image files must be 5MB or smaller");
            return false;
          }
          return true;
        });

        // Session duplicate detection via fast file hash
        const nonDuplicateFiles: { file: File; hash?: string }[] = [];
        for (const f of sizeValidFiles) {
          try {
            const h = await computeFileHash(f);
            if (DuplicateSession.has(h)) {
              showErrorToast(null, `Duplicate image skipped: ${sanitizeDisplayName(f.name)}`);
              continue;
            }
            nonDuplicateFiles.push({ file: f, hash: h });
          } catch {
            // If hashing fails, allow file through (best-effort)
            nonDuplicateFiles.push({ file: f });
          }
        }

        const validFiles: { file: File; hash?: string; tempId: string }[] = [];
        for (const entry of nonDuplicateFiles) {
          const file = entry.file;
          try {
            const dims = await getImageDimensions(file);
            if (!dims) {
              // If dimensions cannot be determined, reject defensively
              showErrorToast(null, "Unable to read image. Please try another file.");
              continue;
            }
            if (dims.width < MIN_WIDTH || dims.height < MIN_HEIGHT) {
              showErrorToast(
                null,
                `Image too small (${dims.width}x${dims.height}). Minimum ${MIN_WIDTH}x${MIN_HEIGHT}px`
              );
              continue;
            }

            // Create a stable temporary ID based on file.name + size + lastModified
            // This improves reorder robustness across re-renders/hot reloads
            const baseName = `${file.name}:${file.size}:${file.lastModified}`;
            // Hash-like deterministic string via TextEncoder + crypto.subtle (fast enough on small input)
            let tempId = "";
            try {
              const enc = new TextEncoder().encode(baseName);
              const digest = await crypto.subtle.digest("SHA-256", enc);
              const hex = Array.from(new Uint8Array(digest))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
              tempId = `local-${hex.slice(0, 24)}`;
            } catch {
              // Fallback to readable ID if subtle crypto not available
              tempId = `local-${baseName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 32)}`;
            }

            // Passed all checks: record hash in session to prevent duplicates this session
            if (entry.hash) {
              try {
                DuplicateSession.add(entry.hash);
              } catch {}
            }

            validFiles.push({ file, hash: entry.hash, tempId });
          } catch {
            showErrorToast(null, "Failed to process image. Please try again.");
          }
        }

        if (validFiles.length === 0) {
          setIsLoading(false);
          return;
        }

        const newItems: LocalImageItem[] = [
          ...items,
          ...validFiles.map(({ file, tempId }) => ({
            localId: tempId,
            file,
            previewUrl: URL.createObjectURL(file),
          })),
        ];

        setItems(newItems);
        emitChange(newItems);
      } catch (error) {
        console.error("Error processing images:", error);
        setUploadError("Failed to process images. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [items, maxImages, emitChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Accept only jpeg/png/webp to align with server validators
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      // Allow unknown/empty types to pass via manual selection; dropzone filters by extension here
    },
    maxFiles: Math.max(0, maxImages - items.length),
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeImage = (idx: number) => {
    setIsLoading(true);
    setUploadError(null);

    try {
      const target = items[idx];
      if (target?.previewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      const newItems = items.filter((_, i) => i !== idx);
      setItems(newItems);
      emitChange(newItems);
    } catch (error) {
      console.error("Error removing image:", error);
      setUploadError("Failed to remove image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      onDrop(Array.from(files));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error message */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <span className="ml-2 text-sm text-gray-600">
            Processing images...
          </span>
        </div>
      )}

      {/* Image previews */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it, index) => (
            <div key={it.localId} className="relative aspect-square">
              <Image
                src={it.previewUrl}
                alt={`Selected ${index + 1}`}
                fill
                className="object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {items.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${
              isDragActive
                ? "border-pink-500 bg-pink-50"
                : "border-gray-300 hover:border-gray-400"
            }
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? "Drop images here..."
              : "Drag & drop images here, or click to select"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {maxImages - items.length} image
            {maxImages - items.length !== 1 ? "s" : ""} remaining
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max 5MB per image, JPG, PNG, WebP
          </p>
        </div>
      )}

      {/* Hidden file input for button click */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
