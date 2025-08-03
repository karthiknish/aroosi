import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { showErrorToast } from "@/lib/ui/toast";
import type { ImageType } from "@/types/image";

interface LocalImageUploadProps {
  onImagesChanged: (imageFiles: (string | ImageType)[]) => void;
  maxImages?: number;
  className?: string;
}

type LocalImageItem = {
  localId: string;
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
        fileName: it.file.name,
        name: it.file.name,
        size: it.file.size,
        storageId: "",
        uploadedAt: Date.now(),
      }));
      onImagesChanged(imageTypeObjects);
    },
    [onImagesChanged],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
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

        // Validate only size here; type normalization is handled at upload time
        const validFiles = filesToAdd.filter((file) => {
          const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
          if (!isValidSize) {
            setUploadError("Image files must be 5MB or smaller");
            return false;
          }
          return true;
        });

        if (validFiles.length === 0) {
          setIsLoading(false);
          return;
        }

        const newItems: LocalImageItem[] = [
          ...items,
          ...validFiles.map((file) => ({
            localId: `local-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
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
