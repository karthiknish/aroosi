import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Ensure currentIndex is reset if images or initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, images]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{images[currentIndex]?.name}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-square">
          <Image
            src={images[currentIndex]?.url}
            alt={images[currentIndex]?.name}
            layout="fill"
            objectFit="contain"
          />
          {images.length > 1 && (
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
      </DialogContent>
    </Dialog>
  );
};

export default ProfileImageModal;
