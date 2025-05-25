import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { createImage, getCroppedImg, readFile } from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Cropper, { Area } from "react-easy-crop";
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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
                  style={{ containerStyle: { borderRadius: "0.5rem" } }}
                />
              </div>
            )}
            <div className="flex items-center gap-4 pt-2">
              <span className="text-xs text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32"
              />
            </div>
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
                    const image = await createImage(imagePreview);
                    const croppedBlob = await getCroppedImg(
                      image,
                      croppedAreaPixels,
                      `cropped_${Date.now()}.jpg`,
                      1
                    );
                    const croppedFile = new File(
                      [croppedBlob],
                      `cropped_${Date.now()}.jpg`,
                      {
                        type: "image/jpeg",
                      }
                    );
                    await uploadImageFile(croppedFile);
                    setIsCropping(false);
                    setImagePreview(null);
                    setPendingUpload(null);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setCroppedAreaPixels(null);
                  } catch (error) {
                    console.error("Error cropping image:", error);
                  }
                }}
                disabled={!croppedAreaPixels || isUploading}
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
