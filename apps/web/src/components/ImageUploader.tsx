import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { subscriptionAPI } from "@/lib/api/subscription";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Upload, XCircle } from "lucide-react";
import type { ProfileImageInfo } from "@aroosi/shared/types";
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
import { uploadProfileImageWithProgressCancellable } from "@/lib/utils/imageUtil";
import {
  computeFileHash,
  DuplicateSession,
} from "@/lib/utils/imageUploadHelpers";
import { planDisplayName } from "@/lib/utils/subscriptionRateLimit";

// Client-side mirror of server limits (bytes) for UX guidance.
const CLIENT_PLAN_SIZE_LIMITS: Record<string, number> = {
  free: 2 * 1024 * 1024,
  premium: 5 * 1024 * 1024,
  premiumPlus: 10 * 1024 * 1024,
};
const FALLBACK_MAX = 5 * 1024 * 1024;

async function fetchSubscriptionPlan(): Promise<string> {
  try {
    const result = await subscriptionAPI.getStatus();
    if (result?.plan) {
      return result.plan;
    }
    return "free";
  } catch {
    return "free";
  }
}

type ImageUploaderMode = "local" | "immediate";

interface ImageUploaderProps {
  userId: string;
  orderedImages: ProfileImageInfo[];
  setIsUploading: (val: boolean) => void;
  disabled?: boolean;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
  fetchImages: () => Promise<unknown>;
  onStartUpload?: () => void;
  customUploadFile?: (file: File) => Promise<void>;
  onOptimisticUpdate?: (newImage: ProfileImageInfo) => void;
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
  const [plan, setPlan] = useState<string>("free");
  const [maxSizeBytes, setMaxSizeBytes] = useState<number>(
    CLIENT_PLAN_SIZE_LIMITS.free
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [eta, setEta] = useState<string | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Fetch subscription plan once on mount
  useEffect(() => {
    let active = true;
    fetchSubscriptionPlan().then((p) => {
      if (!active) return;
      setPlan(p);
      setMaxSizeBytes(CLIENT_PLAN_SIZE_LIMITS[p] || FALLBACK_MAX);
    });
    return () => {
      active = false;
    };
  }, []);


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
        showErrorToast(
          null,
          "Only image files are allowed (JPG, PNG, WebP, HEIC)"
        );
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
      "image/heic": [],
      "image/heif": [],
    },
    maxSize: maxSizeBytes,
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
        if (file.size > maxSizeBytes) {
          showErrorToast(
            null,
            `Image is too large (max ${Math.round(maxSizeBytes / 1024 / 1024)}MB)`
          );
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
        const localImg: ProfileImageInfo = {
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
          setUploadProgress(10);
          await customUploadFile(file);
          showSuccessToast("Image uploaded successfully");
          await fetchImages();
          return {
            success: true,
            imageId: "custom",
            message: "Uploaded",
          };
        }

        // Immediate upload with progress
        setStatusMessage("Uploading...");
        setUploadProgress(0);
        setEta(null);
        setUploadSpeed(null);
        
        const startTime = Date.now();
        
        const { promise, cancel } = uploadProfileImageWithProgressCancellable(
          file,
          (loaded, total) => {
            const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
            setUploadProgress(pct);
            
            // Calculate speed and ETA
            const elapsedMs = Date.now() - startTime;
            if (elapsedMs > 1000 && total > 0) {
              const bytesPerMs = loaded / elapsedMs;
              const remainingBytes = total - loaded;
              const remainingMs = remainingBytes / bytesPerMs;
              
              // Format speed
              const mbps = (bytesPerMs * 1000) / (1024 * 1024);
              setUploadSpeed(`${mbps.toFixed(1)} MB/s`);
              
              // Format ETA
              if (remainingMs > 0) {
                const seconds = Math.ceil(remainingMs / 1000);
                if (seconds < 60) {
                  setEta(`${seconds}s remaining`);
                } else {
                  const mins = Math.floor(seconds / 60);
                  const secs = seconds % 60;
                  setEta(`${mins}m ${secs}s remaining`);
                }
              }
            }

            if (liveRegionRef.current) {
              liveRegionRef.current.textContent = `Uploading ${pct}%`;
            }
          }
        );
        
        cancelUploadRef.current = cancel;
        const json = await promise;
        
        setUploadProgress(100);
        setStatusMessage("Processing...");
        setEta(null);
        setUploadSpeed(null);

        // Optimistic update
        if (onOptimisticUpdate && json?.imageId) {
          const optimisticImage: ProfileImageInfo = {
            storageId: json.imageId,
            url: json.url || "",
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
        setStatusMessage("Upload complete");

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
        setUploadProgress(0);
        setStatusMessage("");
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
      plan,
      maxSizeBytes,
    ]
  );

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`relative group rounded-xl transition-all ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-neutral/5"
        }`}
      >
        <input {...getInputProps()} />
        <div
          className={`
            flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed 
            ${isDragActive ? "border-primary bg-primary/10" : "border-neutral/10"}
            transition-all duration-200 ease-in-out
            group-hover:border-primary/60
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <div className="w-10 h-10 relative">
                <Skeleton className="w-10 h-10 rounded-full" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
                  {uploadProgress > 0 ? `${uploadProgress}%` : ""}
                </span>
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-light px-1">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{statusMessage || "Uploading"}</span>
                    {pendingUpload && (
                      <span className="text-[10px] opacity-70">
                        {(pendingUpload.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span>{uploadProgress}%</span>
                    {eta && <span className="text-[10px] text-primary font-medium">{eta}</span>}
                  </div>
                </div>
                <div className="w-full bg-neutral/10 rounded-full h-2 overflow-hidden relative">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-neutral-light">
                    {uploadSpeed || "Please keep this tab open..."}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cancelUploadRef.current) {
                        cancelUploadRef.current();
                        showErrorToast("Upload cancelled");
                      }
                    }}
                    className="h-6 px-2 text-[10px] text-danger hover:text-danger hover:bg-danger/10"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
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
                <p className="text-sm text-neutral-light">
                  We&apos;ll optimize your photo automatically
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Upload className="w-8 h-8 text-neutral-light" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-dark">
                  Drag & drop a photo
                </p>
                <p className="text-xs text-neutral-light leading-relaxed">
                  or click to browse. Max{" "}
                  {Math.round(maxSizeBytes / 1024 / 1024)}MB per image (
                  {planDisplayName(plan)} plan).
                  <br />
                  JPG, PNG, WebP{plan !== "free" ? ", HEIC" : ""}. Minimum
                  512×512px.
                </p>
                {plan === "free" && (
                  <p className="text-[11px] text-warning">
                    Upgrade for higher size limits & HEIC support.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium tracking-wide">
            {planDisplayName(plan)}
          </span>
        </div>
      </div>

      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      />

      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-2xl bg-base-light">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area and click &apos;Upload&apos; when done
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {typeof window !== "undefined" && imagePreview && (
              <>
                <div className="relative max-h-[60vh] h-[400px] w-full bg-neutral/5 rounded-lg border border-neutral/10">
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
