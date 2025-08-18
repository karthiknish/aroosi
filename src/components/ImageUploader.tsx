import { useCallback, useState, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Upload } from "lucide-react";
import type { ImageType } from "@/types/image";
import Cropper, { Area } from "react-easy-crop";
import { RotateCw, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { uploadProfileImage } from "@/lib/utils/imageUtil";
import {
  computeFileHash,
  DuplicateSession,
} from "@/lib/utils/imageUploadHelpers";

type ImageUploaderMode = "local" | "immediate";

interface ImageUploaderProps {
  userId: string;
  orderedImages: ImageType[];
  setIsUploading: (val: boolean) => void;
  disabled?: boolean;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
  fetchImages: () => Promise<unknown>;
  onStartUpload?: () => void;
  customUploadFile?: (file: File) => Promise<void>;
  onOptimisticUpdate?: (newImage: ImageType) => void;
  mode?: ImageUploaderMode;
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
  quality = 0.92,
  rotateDeg = 0
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  if (rotateDeg) {
    ctx.translate(crop.width / 2, crop.height / 2);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    ctx.translate(-crop.width / 2, -crop.height / 2);
  }
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
  setIsUploading,
  disabled = false,
  isUploading = false,
  className = "",
  fetchImages,
  onStartUpload,
  customUploadFile,
  maxFiles,
  onOptimisticUpdate,
  mode = "immediate",
}: ImageUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<1 | 0.8 | 0.75>(1);
  const [rotate, setRotate] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isClient, setIsClient] = useState(typeof window !== "undefined");

  useEffect(() => setIsClient(true), []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;

      // Guard against the user exceeding the max allowed images for their profile
      const currentImagesCount = orderedImages?.length ?? 0;
      const maxAllowed = maxFiles ?? 5;
      if (currentImagesCount >= maxAllowed) {
        showErrorToast(
          null,
          `You can only display up to ${maxAllowed} images on your profile`
        );
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Extra guard: ensure MIME starts with image/
      if (!file.type.startsWith("image/")) {
        showErrorToast(null, "Only image files are allowed (JPG, PNG, WebP)");
        return;
      }

      setPendingUpload(file);
      readFile(file)
        .then((preview) => {
          setImagePreview(preview);
          setIsCropping(true);
        })
        .catch(() => {
          showErrorToast(
            null,
            "Failed to read image. Please try another file."
          );
        });
    },
    [orderedImages, maxFiles]
  );

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (!fileRejections?.length) return;
    const rejection = fileRejections[0];
    const { errors } = rejection;
    if (!errors?.length) {
      showErrorToast(null, "File cannot be uploaded.");
      return;
    }
    const code = errors[0].code;
    switch (code) {
      case "file-too-large":
        showErrorToast(null, "Image is too large (max 5 MB).");
        break;
      case "file-invalid-type":
        showErrorToast(
          null,
          "Invalid file type. Only JPG, PNG, or WebP allowed."
        );
        break;
      default:
        showErrorToast(null, errors[0].message || "File cannot be uploaded.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: disabled || isUploading,
  });

  const getImageDimensions = useCallback(
    async (file: File): Promise<{ width: number; height: number } | null> => {
      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(file);
        if (typeof (globalThis as any).createImageBitmap === "function") {
          const bitmap: ImageBitmap = await (
            globalThis as any
          ).createImageBitmap(file);
          const dims = { width: bitmap.width, height: bitmap.height };
          if (typeof (bitmap as any).close === "function") {
            try {
              (bitmap as any).close();
            } catch {}
          }
          return dims;
        }
        const dims = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = document.createElement("img");
            img.onload = () =>
              resolve({
                width:
                  (img as HTMLImageElement).naturalWidth ||
                  (img as HTMLImageElement).width,
                height:
                  (img as HTMLImageElement).naturalHeight ||
                  (img as HTMLImageElement).height,
              });
            img.onerror = () =>
              reject(new Error("Failed to load image for dimension check"));
            img.src = objectUrl as string;
          }
        );
        return dims;
      } catch {
        return null;
      } finally {
        if (objectUrl && objectUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        }
      }
    },
    []
  );

  const uploadImageFile = useCallback(
    async (file: File) => {
      const isLocalMode =
        mode === "local" || !userId || userId === "user-id-placeholder";
      const maxProfileImages = maxFiles ?? 5;
      const currentImages = orderedImages || [];
      if (currentImages.length >= maxProfileImages) {
        showErrorToast(
          null,
          `You can only display up to ${maxProfileImages} images on your profile`
        );
        return;
      }

      if (isLocalMode) {
        // Preflight: size and dimension checks, duplicate session detection
        if (file.size > 5 * 1024 * 1024) {
          showErrorToast(null, "Image is too large (max 5MB)");
          return;
        }
        try {
          const hash = await computeFileHash(file);
          if (DuplicateSession.has(hash)) {
            showErrorToast(null, "Duplicate image skipped");
            return;
          }
          try {
            DuplicateSession.add(hash);
          } catch {}
        } catch {}

        const dims = await getImageDimensions(file);
        if (!dims || dims.width < 512 || dims.height < 512) {
          showErrorToast(
            null,
            `Image too small${dims ? ` (${dims.width}x${dims.height})` : ""}. Minimum 512x512px`
          );
          return;
        }

        const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const localImg: ImageType = {
          id: tempId,
          storageId: tempId,
          url: URL.createObjectURL(file),
          fileName: file.name,
        };
        if (onOptimisticUpdate) onOptimisticUpdate(localImg);
        showSuccessToast("Image added");
        return { success: true, imageId: tempId, message: "local" };
      }
      try {
        setIsUploading(true);
        if (onStartUpload) onStartUpload();

        // Use custom uploader if provided (e.g., admin flow)
        if (customUploadFile) {
          await customUploadFile(file);
          showSuccessToast("Image uploaded successfully");
          await fetchImages();
          return {
            success: true,
            imageId: "custom",
            message: "Uploaded",
          };
        }

        // Immediate upload: use canonical utility to upload via multipart endpoint
        console.log("[ImageUploader] Starting upload for file:", file.name);
        const json = await uploadProfileImage(file);
        console.log("[ImageUploader] Upload result:", json);

        // Optimistic update
        if (onOptimisticUpdate && json?.imageId) {
          const optimisticImage: ImageType = {
            id: json.imageId,
            url: json.url || "",
            storageId: json.imageId,
            fileName: file.name,
          };
          onOptimisticUpdate(optimisticImage);
        }

        const mutationResult = {
          success: true,
          imageId: json.imageId || "",
          message: "Uploaded",
        };

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
      setIsUploading,
      onStartUpload,
      customUploadFile,
      maxFiles,
      fetchImages,
      onOptimisticUpdate,
      mode,
      getImageDimensions,
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
            ${isDragActive ? "border-primary bg-primary/10" : "border-border"}
            transition-all duration-200 ease-in-out
            group-hover:border-primary/60
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full animate-pulse"
                    style={{ width: "70%" }}
                  ></div>
                </div>
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ) : isDragActive ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-primary">
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
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area and click &apos;Upload&apos; when done
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {isClient && imagePreview && (
              <>
                <div className="relative max-h-[60vh] h-[400px] w-full bg-muted/20 rounded-lg border border-border">
                  <Cropper
                    image={imagePreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
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
                        border: "2px solid #BFA67A",
                        borderRadius: "0.75rem",
                        boxShadow: "0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.12)",
                        cursor: "move",
                        background: "rgba(255,255,255,0.02)",
                      },
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={aspect === 1 ? "default" : "outline"}
                      onClick={() => setAspect(1)}
                      size="sm"
                    >
                      1:1
                    </Button>
                    <Button
                      type="button"
                      variant={aspect === 0.8 ? "default" : "outline"}
                      onClick={() => setAspect(0.8)}
                      size="sm"
                    >
                      4:5
                    </Button>
                    <Button
                      type="button"
                      variant={aspect === 0.75 ? "default" : "outline"}
                      onClick={() => setAspect(0.75)}
                      size="sm"
                    >
                      3:4
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotate((r) => (r - 90 + 360) % 360)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Rotate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotate((r) => (r + 90) % 360)}
                    >
                      <RotateCw className="w-3 h-3 mr-1" />
                      Rotate
                    </Button>
                  </div>
                </div>
              </>
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
                      0.9,
                      rotate
                    );
                    const croppedFile = new File(
                      [croppedBlob],
                      `cropped_${timestamp}.jpg`,
                      {
                        type: "image/jpeg",
                      }
                    );
                    const result = await uploadImageFile(croppedFile);
                    // Only fetch server images if not pure local mode
                    if (result?.success && mode !== "local") {
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
                className="bg-primary hover:bg-primary-dark"
                disabled={!croppedAreaPixels || isUploading}
              >
                {isUploading && mode !== "local" ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {mode === "local" ? "Add" : "Upload"}
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
