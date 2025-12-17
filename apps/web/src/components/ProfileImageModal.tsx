import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Crop as CropIcon,
  Check,
  X,
} from "lucide-react";
import Cropper, { Area } from "react-easy-crop";

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { url: string; name: string }[];
  initialIndex?: number;
}

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Ensure currentIndex is reset if images or initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsCropping(false);
    setPreviewUrl(null);
    setRotate(0);
    setZoom(1);
  }, [initialIndex, images]);
  const createImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
      img.crossOrigin = "anonymous";
    });

  const handleApplyCrop = useCallback(async () => {
    if (!isCropping || !croppedAreaPixels) return;
    try {
      const src = previewUrl || images[currentIndex]?.url;
      if (!src) return;
      // inline cropper to keep stable deps
      const image = await createImage(src);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.translate(-croppedAreaPixels.x, -croppedAreaPixels.y);
      if (rotate) {
        const cx = image.width / 2;
        const cy = image.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setPreviewUrl(dataUrl);
      setIsCropping(false);
    } catch {}
  }, [isCropping, croppedAreaPixels, previewUrl, images, currentIndex, rotate]);

  // Prevent out-of-bounds errors if images array changes
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(images.length > 0 ? images.length - 1 : 0);
    }
  }, [images, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      images.length === 0
        ? 0
        : prevIndex > 0
          ? prevIndex - 1
          : images.length - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      images.length === 0
        ? 0
        : prevIndex < images.length - 1
          ? prevIndex + 1
          : 0
    );
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-base-light">
        <DialogHeader>
          <DialogTitle>{images[currentIndex]?.name}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-square bg-black/80 rounded-md overflow-hidden">
          {isCropping ? (
            <Cropper
              image={previewUrl || images[currentIndex]?.url}
              crop={crop}
              zoom={zoom}
              aspect={1}
              rotation={rotate}
              minZoom={1}
              maxZoom={3}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) =>
                setCroppedAreaPixels(areaPixels)
              }
            />
          ) : (
            <Image
              src={previewUrl || images[currentIndex]?.url}
              alt={images[currentIndex]?.name}
              fill
              style={{ objectFit: "contain" }}
            />
          )}
          {images.length > 1 && !isCropping && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full"
                aria-label="Previous image"
                type="button"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full"
                aria-label="Next image"
                type="button"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 text-sm rounded border border-neutral/10 hover:bg-neutral/5"
              onClick={() => setRotate((r) => (r - 90 + 360) % 360)}
              disabled={isCropping}
            >
              <RotateCcw className="w-4 h-4 inline-block mr-1" /> Rotate
            </button>
            <button
              type="button"
              className="px-2 py-1 text-sm rounded border border-neutral/10 hover:bg-neutral/5"
              onClick={() => setRotate((r) => (r + 90) % 360)}
              disabled={isCropping}
            >
              <RotateCw className="w-4 h-4 inline-block mr-1" /> Rotate
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isCropping ? (
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-primary text-white hover:bg-primary/90"
                onClick={() => {
                  setPreviewUrl(null);
                  setIsCropping(true);
                  setZoom(1);
                  setRotate(0);
                }}
              >
                <CropIcon className="w-4 h-4 inline-block mr-1" /> Crop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded bg-success text-white hover:bg-success/90"
                  onClick={handleApplyCrop}
                >
                  <Check className="w-4 h-4 inline-block mr-1" /> Apply
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded border border-neutral/10 hover:bg-neutral/5"
                  onClick={() => {
                    setIsCropping(false);
                    setCroppedAreaPixels(null);
                    setZoom(1);
                    setRotate(0);
                  }}
                >
                  <X className="w-4 h-4 inline-block mr-1" /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileImageModal;
