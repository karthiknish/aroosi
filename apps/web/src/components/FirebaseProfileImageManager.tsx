"use client";

import React, { useState, useCallback } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { FirebaseImageGallery } from "@/components/FirebaseImageGallery";
import { FirebaseProfileImageUpload } from "@/components/FirebaseProfileImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function FirebaseProfileImageManager() {
  const { user } = useFirebaseAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [galleryRefreshToken, setGalleryRefreshToken] = useState(0);

  // Refresh images
  const refreshImages = useCallback(() => {
    setIsRefreshing(true);
    setGalleryRefreshToken((value) => value + 1);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (_imageData: { url: string; storageId: string }) => {
      setGalleryRefreshToken((value) => value + 1);
    },
    []
  );

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
              aria-label={isRefreshing ? "Refreshing images..." : "Refresh images"}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FirebaseImageGallery
            userId={user.uid}
            refreshToken={galleryRefreshToken}
            onLoadComplete={() => setIsRefreshing(false)}
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