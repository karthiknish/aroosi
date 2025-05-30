import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import type { ImageData } from "./ProfileImageUpload";
import { QueryObserverResult } from "@tanstack/react-query";

interface ImageUploaderProps {
  userId: string;
  orderedImages: ImageData[];
  generateUploadUrl: () => Promise<
    string | { success: boolean; error: string }
  >;
  uploadImage: (args: {
    userId: Id<"users">;
    storageId: Id<"_storage">;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{ success: boolean; imageId: Id<"_storage">; message: string }>;
  setIsUploading: (val: boolean) => void;
  toast: typeof import("sonner").toast;
  disabled?: boolean;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
  fetchImages: () => Promise<
    QueryObserverResult<ImageData[] | undefined, Error>
  >;
  onStartUpload?: () => void;
}

export function ImageUploader({
  userId,
  orderedImages,
  generateUploadUrl,
  uploadImage,
  setIsUploading,
  toast,
  disabled = false,
  isUploading = false,
  className = "",
  fetchImages,
  onStartUpload,
}: ImageUploaderProps) {
  console.log("[ImageUploader] received orderedImages:", orderedImages);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Handle file upload directly
      if (onStartUpload) onStartUpload();
      if (!userId) return;

      const uploadFile = async () => {
        try {
          setIsUploading(true);
          const uploadUrl = await generateUploadUrl();
          if (typeof uploadUrl !== "string") {
            throw new Error("Failed to get upload URL");
          }

          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error("Failed to upload image");
          }

          const { storageId } = await result.json();

          const mutationResult = await uploadImage({
            userId: userId as Id<"users">,
            storageId: storageId as Id<"_storage">,
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          });

          if (!mutationResult.success) {
            throw new Error(mutationResult.message || "Upload failed");
          }

          await fetchImages();
          toast.success("Image uploaded successfully");
        } catch (error) {
          console.error("Error uploading image:", error);
          if (error instanceof ConvexError) {
            toast.error(
              "Something went wrong while uploading your image. Please try again."
            );
          } else {
            toast.error("Failed to upload image");
          }
        } finally {
          setIsUploading(false);
        }
      };

      uploadFile();
    },
    [
      userId,
      generateUploadUrl,
      uploadImage,
      fetchImages,
      toast,
      setIsUploading,
      onStartUpload,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: disabled || isUploading,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`relative group rounded-xl transition-all border-2 border-dashed ${
          disabled
            ? "opacity-50 cursor-not-allowed border-gray-200"
            : "cursor-pointer border-pink-600 hover:border-pink-700 bg-pink-50/30 group-hover:bg-pink-50/60"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-pink-600">Uploading...</p>
            </div>
          ) : isDragActive ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Upload className="w-8 h-8 text-pink-600" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-pink-600">
                  Drop to upload
                </p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll optimize your photo automatically
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Upload className="w-8 h-8 text-pink-600 group-hover:text-pink-700 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-pink-600 group-hover:text-pink-700 transition-colors">
                  Drag & drop a photo
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse. Max 5MB (JPG, PNG, WebP)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
