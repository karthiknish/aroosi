import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Upload } from "lucide-react";
import type { ImageType } from "@/types/image";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

interface ImageUploaderProps {
  userId: string;
  orderedImages: ImageType[];
  generateUploadUrl: () => Promise<
    string | { success: boolean; error: string }
  >;
  uploadImage: (args: {
    userId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{ success: boolean; imageId: string; message: string }>;
  setIsUploading: (val: boolean) => void;
  disabled?: boolean;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
  fetchImages: () => Promise<unknown>;
  onStartUpload?: () => void;
}

// Utility: read file as data URL
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Utility: create HTMLImageElement from src
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Utility: crop image using canvas
async function getCroppedImg(
  image: HTMLImageElement,
  crop: Area,
  fileName: string,
  quality = 1
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

export function ImageUploader({
  userId,
  orderedImages,
  generateUploadUrl,
  uploadImage,
  setIsUploading,
  disabled = false,
  isUploading = false,
  className = "",
  fetchImages,
  onStartUpload,
}: ImageUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setPendingUpload(file);
    readFile(file).then((preview) => {
      setImagePreview(preview);
      setIsCropping(true);
    });
  }, []);

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

  const uploadImageFile = useCallback(
    async (file: File) => {
      if (!userId) return;
      const currentImages = orderedImages || [];
      const maxProfileImages = 10;
      if (currentImages.length >= maxProfileImages) {
        showErrorToast(
          null,
          `You can only display up to ${maxProfileImages} images on your profile`
        );
        return;
      }
      try {
        setIsUploading(true);
        if (onStartUpload) onStartUpload();

        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();
        if (typeof uploadUrl !== "string") {
          throw new Error("Failed to get upload URL");
        }

        // Step 2: Upload the file to storage
        const storageResp = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!storageResp.ok) {
          const msg =
            storageResp.status === 413
              ? "Image is too large (max 5MB)."
              : "Failed to upload image to storage.";
          throw new Error(msg);
        }

        // Convex storage returns storageId as plain text, not JSON
        const storageId = await storageResp.text();

        // Step 3: Save the image reference in the database
        const mutationResult = await uploadImage({
          userId,
          storageId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });

        if (!mutationResult?.success) {
          throw new Error(mutationResult?.message || "Upload failed");
        }

        // Show success message
        showSuccessToast("Image uploaded successfully");

        // Return the result so the parent component can handle it
        return mutationResult;
      } catch (error) {
        console.error("Error uploading image:", error);
        const msg =
          error instanceof Error ? error.message : "Failed to upload image";
        showErrorToast(msg);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [
      userId,
      orderedImages,
      generateUploadUrl,
      uploadImage,
      setIsUploading,
      onStartUpload,
    ]
  );

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`relative group rounded-xl transition-all ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-accent/20"
        }`}
      >
        <input {...getInputProps()} />
        <div
          className={`
            flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed 
            ${isDragActive ? "border-pink-600 bg-pink-50" : "border-border"}
            transition-all duration-200 ease-in-out
            group-hover:border-pink-400
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-pink-600 h-1.5 rounded-full animate-pulse"
                    style={{ width: "70%" }}
                  ></div>
                </div>
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
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
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
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

      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area and click &apos;Upload&apos; when done
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {isClient && imagePreview && (
              <div className="relative max-h-[60vh] h-[400px] w-full bg-muted/20 rounded-lg border border-border">
                <Cropper
                  image={imagePreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  minZoom={1}
                  maxZoom={3}
                  cropShape="rect"
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) =>
                    setCroppedAreaPixels(croppedAreaPixels)
                  }
                  style={{
                    containerStyle: { borderRadius: "0.75rem" },
                    cropAreaStyle: {
                      border: "2px solid #6366f1",
                      borderRadius: "0.75rem",
                      boxShadow: "0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.12)",
                      cursor: "move",
                      background: "rgba(255,255,255,0.02)",
                    },
                  }}
                />
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCropping(false);
                  setImagePreview(null);
                  setPendingUpload(null);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!croppedAreaPixels || !imagePreview || !pendingUpload)
                    return;
                  try {
                    const timestamp = Date.now();
                    const image = await createImage(imagePreview);
                    const croppedBlob = await getCroppedImg(
                      image,
                      croppedAreaPixels,
                      `cropped_${timestamp}.jpg`,
                      1
                    );
                    const croppedFile = new File(
                      [croppedBlob],
                      `cropped_${timestamp}.jpg`,
                      {
                        type: "image/jpeg",
                      }
                    );
                    const result = await uploadImageFile(croppedFile);
                    if (result?.success) {
                      // Only fetch images if the upload was successful
                      await fetchImages();
                    }
                    setIsCropping(false);
                    setImagePreview(null);
                    setPendingUpload(null);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setCroppedAreaPixels(null);
                  } catch (error) {
                    console.error("Error cropping image:", error);
                    showErrorToast(
                      null,
                      "Failed to crop image. Please try again."
                    );
                  }
                }}
                className="bg-pink-600 hover:bg-pink-500"
                disabled={!croppedAreaPixels || isUploading}
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
