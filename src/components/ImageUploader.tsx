import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import {
  createImage,
  getCroppedImg,
  readFile,
  centerAspectCrop,
} from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ReactCrop, {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Id } from "@/../convex/_generated/dataModel";

interface ImageUploaderProps {
  userId: Id<"users">;
  orderedImages: any[];
  isAdmin?: boolean;
  profileId?: Id<"profiles">;
  onImagesChanged?: () => void;
  generateUploadUrl: any;
  uploadImage: any;
  updateProfile: any;
  adminUpdateProfile: any;
  setIsUploading: (val: boolean) => void;
  toast: any;
  disabled?: boolean;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
}

// Helper to convert percent crop to pixel crop
function percentCropToPixelCrop(
  crop: CropType | PixelCrop,
  image: HTMLImageElement
): PixelCrop {
  if (!image || crop.unit === "px") return crop as PixelCrop;
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  return {
    unit: "px",
    x: Math.round((crop.x / 100) * width),
    y: Math.round((crop.y / 100) * height),
    width: Math.round((crop.width / 100) * width),
    height: Math.round((crop.height / 100) * height),
  };
}

// Helper to get a centered aspect crop
function getCenteredAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
        aspect,
      },
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageUploader({
  userId,
  orderedImages,
  isAdmin = false,
  profileId,
  onImagesChanged,
  generateUploadUrl,
  uploadImage,
  updateProfile,
  adminUpdateProfile,
  setIsUploading,
  toast,
  disabled = false,
  isUploading = false,
  maxFiles = 5,
  className = "",
}: ImageUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

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
      if (currentImages.length >= maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} images`);
        return;
      }
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
        await uploadImage({
          userId,
          storageId: storageId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
        const currentImageIds = orderedImages.map((img: any) => img.storageId);
        const newOrder = [...currentImageIds, storageId];
        if (isAdmin && profileId) {
          await adminUpdateProfile({
            id: profileId,
            updates: { profileImageIds: newOrder },
          });
        } else {
          await updateProfile({ profileImageIds: newOrder });
        }
        if (onImagesChanged) onImagesChanged();
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image");
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [
      userId,
      orderedImages,
      isAdmin,
      profileId,
      onImagesChanged,
      generateUploadUrl,
      uploadImage,
      adminUpdateProfile,
      updateProfile,
      setIsUploading,
      toast,
      maxFiles,
    ]
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(getCenteredAspectCrop(width, height, 1));
    },
    []
  );

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imagePreview || !pendingUpload)
      return;
    // Ensure completedCrop is in pixels
    const pixelCrop = percentCropToPixelCrop(completedCrop, imgRef.current);
    try {
      const image = await createImage(imagePreview);
      const croppedBlob = await getCroppedImg(
        image,
        pixelCrop,
        `cropped_${Date.now()}.jpg`,
        1
      );
      const croppedFile = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await uploadImageFile(croppedFile);
      setIsCropping(false);
      setImagePreview(null);
      setPendingUpload(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  }, [completedCrop, imagePreview, uploadImageFile, pendingUpload]);

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
            ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
            transition-all duration-200 ease-in-out
            group-hover:border-primary/50
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Uploading your photo
                </p>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full animate-pulse"
                    style={{ width: "70%" }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will just take a moment...
                </p>
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
                  We'll optimize your photo automatically
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
              Adjust the crop area and click 'Upload' when done
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {imagePreview && (
              <div className="relative max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/20 p-2">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => {
                    // Always set completedCrop as pixel crop
                    if (imgRef.current) {
                      setCompletedCrop(
                        percentCropToPixelCrop(c, imgRef.current)
                      );
                    } else {
                      setCompletedCrop(c);
                    }
                  }}
                  aspect={1}
                  minWidth={200}
                  minHeight={200}
                  className="[&_img]:rounded-sm [&_.react-crop__crop-selection]:border-2 [&_.react-crop__crop-selection]:border-primary [&_.react-crop__crop-selection]:shadow-lg"
                >
                  <img
                    ref={imgRef}
                    src={imagePreview}
                    alt="Crop preview"
                    className="max-w-full rounded-sm"
                    onLoad={onImageLoad}
                    style={{
                      maxHeight: "60vh",
                      objectFit: "contain",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                </ReactCrop>
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
                  setCrop(undefined);
                  setCompletedCrop(undefined);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                disabled={!completedCrop || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
