import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Eye, Grid, LayoutPanelLeft } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { fetchProfileImages, deleteImageById } from "@/lib/utils/imageUtil";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface FirebaseImage {
  url: string;
  storageId: string;
  fileName: string;
  uploadedAt?: string;
}

interface FirebaseImageGalleryProps {
  userId?: string;
  onImageDelete?: (storageId: string) => void;
  isAdmin?: boolean;
}

export function FirebaseImageGallery({
  userId: propUserId,
  onImageDelete,
  isAdmin = false,
}: FirebaseImageGalleryProps) {
  const { user } = useFirebaseAuth();
  const [images, setImages] = useState<FirebaseImage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");

  // Use provided userId or fallback to current user's ID
  const targetUserId = propUserId || user?.uid;

  // Fetch images from Firebase Storage
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["firebase-images", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const images = await fetchProfileImages(targetUserId);
      return images as FirebaseImage[];
    },
    enabled: !!targetUserId,
  });

  // Update images when data changes
  useEffect(() => {
    if (data) {
      setImages(data);
    }
  }, [data]);

  // Delete an image
  const handleDelete = async (storageId: string) => {
    if (!targetUserId) return;

    setDeletingId(storageId);

    try {
      await deleteImageById(storageId);

      // Remove the image from state
      setImages((prev) => prev.filter((img) => img.storageId !== storageId));
      showSuccessToast("Image deleted successfully");
      onImageDelete?.(storageId);
    } catch (error) {
      console.error("Delete failed:", error);
      showErrorToast(
        error instanceof Error ? error.message : "Failed to delete image"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!targetUserId) {
    return <div>Please sign in to view images</div>;
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-light">
        No images uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("grid")}
          className="gap-2"
        >
          <Grid className="h-4 w-4" />
          Grid
        </Button>
        <Button
          variant={viewMode === "carousel" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("carousel")}
          className="gap-2"
        >
          <LayoutPanelLeft className="h-4 w-4" />
          Carousel
        </Button>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <Card key={image.storageId} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-neutral-dark/0 hover:bg-neutral-dark/30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-base-light/80 hover:bg-base-light"
                    onClick={() => window.open(image.url, "_blank")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(isAdmin || user?.uid === targetUserId) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-danger/80 hover:bg-danger"
                      onClick={() => handleDelete(image.storageId)}
                      disabled={deletingId === image.storageId}
                    >
                      {deletingId === image.storageId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs text-neutral-light truncate">{image.fileName}</p>
                {image.uploadedAt && (
                  <p className="text-xs text-neutral-light/70">
                    {new Date(image.uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="px-12">
          <Carousel className="w-full max-w-xl mx-auto">
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.storageId}>
                  <Card className="overflow-hidden">
                    <div className="relative aspect-square">
                      <img
                        src={image.url}
                        alt={image.fileName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-base-light/80 hover:bg-base-light"
                          onClick={() => window.open(image.url, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full
                        </Button>
                        {(isAdmin || user?.uid === targetUserId) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-danger/80 hover:bg-danger"
                            onClick={() => handleDelete(image.storageId)}
                            disabled={deletingId === image.storageId}
                          >
                            {deletingId === image.storageId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm font-medium text-neutral-dark truncate">
                        {image.fileName}
                      </p>
                      {image.uploadedAt && (
                        <p className="text-xs text-neutral-light">
                          Uploaded on {new Date(image.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}
    </div>
  );
}