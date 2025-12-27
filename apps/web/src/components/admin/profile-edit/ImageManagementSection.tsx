"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import type { ProfileImageInfo } from "@aroosi/shared/types";

interface ImageManagementSectionProps {
  profileId?: string;
  images: ProfileImageInfo[];
  imagesLoading: boolean;
  uploading: boolean;
  imageError: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteImage: (imageId: string) => Promise<void>;
  handleReorderImages: (newOrder: ProfileImageInfo[]) => Promise<void>;
}

export function ImageManagementSection({
  profileId,
  images,
  imagesLoading,
  uploading,
  imageError,
  handleImageUpload,
  handleDeleteImage,
  handleReorderImages,
}: ImageManagementSectionProps) {
  if (!profileId) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-dark">Profile Images</h3>
        <div className="flex items-center gap-3">
          {uploading && <LoadingSpinner size={16} />}
          <Button
            variant="outline"
            size="sm"
            className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold"
            asChild
          >
            <label className="cursor-pointer">
              Upload New
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {imagesLoading ? (
        <div className="flex items-center justify-center py-12 bg-neutral/5 rounded-xl border border-dashed border-neutral/20">
          <div className="flex items-center gap-3 text-neutral-light">
            <LoadingSpinner size={20} />
            <span>Loading images...</span>
          </div>
        </div>
      ) : (
        <div className="bg-neutral/5 p-6 rounded-xl border border-neutral/10">
          <ProfileImageReorder
            images={images}
            userId={profileId}
            onReorder={handleReorderImages}
            onDeleteImage={handleDeleteImage}
            loading={imagesLoading}
          />
        </div>
      )}
      {imageError && (
        <p className="text-danger text-sm font-medium">{imageError}</p>
      )}
    </section>
  );
}
