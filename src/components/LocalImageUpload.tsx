import React, { useCallback, useState, useRef } from "react";
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

export function LocalImageUpload({
  onImagesChanged,
  maxImages = 5,
  className = "",
}: LocalImageUploadProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsLoading(true);
      setUploadError(null);

      try {
        const remainingSlots = maxImages - selectedImages.length;
        const filesToAdd = acceptedFiles.slice(0, remainingSlots);

        if (acceptedFiles.length > remainingSlots) {
          showErrorToast(
            null,
            `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}`
          );
        }

        // Validate file types and sizes
        const validFiles = filesToAdd.filter((file) => {
          const isValidType = file.type.startsWith("image/");
          const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

          if (!isValidType) {
            setUploadError(
              "Please select valid image files (JPG, PNG, GIF, etc.)"
            );
            return false;
          }

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

        const newImages = [...selectedImages, ...validFiles];
        setSelectedImages(newImages);

        // Create previews
        const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
        const allPreviews = [...imagePreviews, ...newPreviews];
        setImagePreviews(allPreviews);

        // Convert File objects to ImageType objects
        const imageTypeObjects: ImageType[] = newImages.map((file, index) => ({
          id: `local-${Date.now()}-${index}`,
          url: allPreviews[index] || URL.createObjectURL(file),
          _id: `local-${Date.now()}-${index}`,
          fileName: file.name,
          name: file.name,
          size: file.size,
          storageId: "",
          uploadedAt: Date.now(),
        }));

        onImagesChanged(imageTypeObjects);
      } catch (error) {
        console.error("Error processing images:", error);
        setUploadError("Failed to process images. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedImages, maxImages, onImagesChanged, imagePreviews]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: maxImages - selectedImages.length,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeImage = (index: number) => {
    setIsLoading(true);
    setUploadError(null);

    try {
      const newImages = selectedImages.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);

      setSelectedImages(newImages);
      setImagePreviews(newPreviews);

      // Clean up preview URLs
      URL.revokeObjectURL(imagePreviews[index]);

      // Convert File objects to ImageType objects
      const imageTypeObjects: ImageType[] = newImages.map((file, idx) => ({
        id: `local-${Date.now()}-${idx}`,
        url: newPreviews[idx],
        _id: `local-${Date.now()}-${idx}`,
        fileName: file.name,
        name: file.name,
        size: file.size,
        storageId: "",
        uploadedAt: Date.now(),
      }));

      onImagesChanged(imageTypeObjects);
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
      {selectedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={imagePreviews[index]}
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
      {selectedImages.length < maxImages && (
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
            {maxImages - selectedImages.length} image
            {maxImages - selectedImages.length !== 1 ? "s" : ""} remaining
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max 5MB per image, JPG, PNG, GIF, WebP
          </p>
        </div>
      )}

      {/* Hidden file input for button click */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
