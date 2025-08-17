"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { uploadProfileImage, deleteFile } from "@/lib/firebaseStorageClient";
import { FirebaseImageGallery } from "@/components/FirebaseImageGallery";
import { FirebaseProfileImageUpload } from "@/components/FirebaseProfileImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function FirebaseProfileImageManager() {
  const { user } = useFirebaseAuth();
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch images from the API
  const fetchImages = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile-images/firebase?userId=${user.uid}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        setImages(result.images);
      } else {
        throw new Error(result.error || "Failed to fetch images");
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      showErrorToast("Failed to load images");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Refresh images
  const refreshImages = useCallback(async () => {
    setIsRefreshing(true);
    await fetchImages();
    setIsRefreshing(false);
  }, [fetchImages]);

  // Handle image upload
  const handleImageUpload = useCallback(async (imageData: { url: string; storageId: string }) => {
    // Add the new image to the list
    setImages(prev => [...prev, {
      url: imageData.url,
      storageId: imageData.storageId,
      fileName: imageData.storageId.split('/').pop() || '',
      uploadedAt: new Date().toISOString(),
    }]);
    
    showSuccessToast("Image uploaded successfully!");
  }, []);

  // Handle image delete
  const handleImageDelete = useCallback(async (storageId: string) => {
    try {
      // Call the API to delete the image
      const response = await fetch(`/api/profile-images/firebase?storageId=${encodeURIComponent(storageId)}`, {
        method: "DELETE",
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Remove the image from the list
        setImages(prev => prev.filter(img => img.storageId !== storageId));
        showSuccessToast("Image deleted successfully");
      } else {
        throw new Error(result.error || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      showErrorToast(error instanceof Error ? error.message : "Failed to delete image");
    }
  }, []);

  // Load images on component mount
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  if (!user) {
    return <div>Please sign in to manage profile images</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Profile Images</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshImages}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FirebaseImageGallery 
            userId={user.uid}
            onImageDelete={handleImageDelete}
          />
        </CardContent>
      </Card>

      <FirebaseProfileImageUpload 
        onImageUpload={handleImageUpload}
        maxImages={5}
      />
    </div>
  );
}