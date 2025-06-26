import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { updateAdminProfileImageOrder } from "@/lib/profile/adminProfileApi";

export type ApiImage = {
  _id: string;
  storageId: string;
  url: string;
};

export type MappedImage = {
  _id: string;
  storageId: string;
  url: string;
  fileName?: string;
  uploadedAt?: number;
};

/**
 * Fetches profile images for a given profile ID
 */
export const useProfileImages = (profileId: string) => {
  const { token } = useAuthContext();

  const queryOptions = {
    queryKey: ["profile-images", profileId] as const,
    queryFn: async (): Promise<ApiImage[]> => {
      if (!token) throw new Error("No authentication token");
      if (!profileId) return [];
      const response = await fetch(`/api/profile-detail/${profileId}/images`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile images");
      }

      const data = await response.json();
      return Array.isArray(data)
        ? data
        : Array.isArray(data.images)
          ? data.images
          : [];
    },
    enabled: !!token,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  };

  const query = useQuery<ApiImage[], Error>(queryOptions);

  // Add error handling with useEffect to avoid type issues with onError in options
  useEffect(() => {
    if (query.isError) {
      console.error("Error fetching profile images:", query.error);
      showErrorToast(query.error, "Failed to load profile images");
    }
  }, [query.error, query.isError]);

  return query;
};

/**
 * Handles reordering of profile images
 */
export const useImageReorder = (profileId: string) => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return async (newOrder: (string | { _id: string | undefined })[]) => {
    if (!profileId || !token) return;

    // Extract string IDs from the order array which can contain strings or objects with _id
    const imageIds = newOrder
      .map((item) => (typeof item === "string" ? item : item._id))
      .filter(Boolean) as string[];

    try {
      // Update the order on the server
      const res = await fetch(`/api/profile-images/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profileId,
          imageIds: imageIds,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update image order");
      }

      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["profile-images", profileId],
      });

      showSuccessToast("Image order updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating image order", error);
      showErrorToast(error, "Failed to update image order");
      throw error;
    }
  };
};

/**
 * Handles deletion of a profile image
 */
export const useDeleteImage = (profileId: string) => {
  const { token, profile } = useAuthContext();
  const queryClient = useQueryClient();

  return async (imageId: string, skipPrompt: boolean = false) => {
    if (!profileId || !token) return false;

    // Show confirmation prompt only if skipPrompt is false
    if (!skipPrompt) {
      const confirmed = window.confirm(
        "Are you sure you want to delete this image?"
      );
      if (!confirmed) return false;
    }

    try {
      const response = await fetch(`/api/profile-images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: profile?.userId || profileId, imageId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete image");
      }

      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["profile-images", profileId],
      });

      showSuccessToast("Image deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      showErrorToast(error, "Failed to delete image. Please try again.");
      throw error;
    }
  };
};

/**
 * Handles image upload
 */
export const useImageUpload = (userId: string) => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return async (file: File) => {
    if (!userId || !token) {
      throw new Error("Authentication required");
    }

    try {
      // 1) Get an upload URL from our API (which proxies Convex generateUploadUrl)
      const uploadUrlRes = await fetch("/api/profile-images/upload-url", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!uploadUrlRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl } = (await uploadUrlRes.json()) as {
        uploadUrl: string;
      };
      if (!uploadUrl) {
        throw new Error("Upload URL missing");
      }

      // 2) Upload the raw file directly to Convex storage using the signed URL
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        throw new Error(errText || "Failed to upload to storage");
      }

      const { storageId } = (await putRes.json()) as { storageId: string };
      if (!storageId) {
        throw new Error("storageId missing from upload response");
      }

      // 3) Save the file metadata via our metadata endpoint
      const metaRes = await fetch("/api/profile-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          storageId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save image metadata");
      }

      const data = await metaRes.json();

      // Invalidate and refetch images for realtime UI update
      await queryClient.invalidateQueries({
        queryKey: ["profile-images", userId],
      });

      showSuccessToast("Image uploaded successfully");
      return data;
    } catch (error) {
      console.error("Error uploading image:", error);
      showErrorToast(error, "Failed to upload image. Please try again.");
      throw error;
    }
  };
};

/**
 * Maps API image data to the format expected by the UI
 */
export const mapApiImage = (img: ApiImage): MappedImage => ({
  _id: img._id || img.storageId,
  storageId: img.storageId,
  url: img.url,
});

/**
 * Gets the ordered images based on the provided order and image list
 */
export const getOrderedImages = (
  imageOrder: string[],
  mappedImages: MappedImage[]
) => {
  if (!imageOrder?.length) {
    return mappedImages.map((img) => ({
      url: img.url,
      storageId: img.storageId,
      _id: img.storageId,
    }));
  }

  return imageOrder
    .map((storageId) => {
      const img = mappedImages.find((img) => img.storageId === storageId);
      if (img) {
        return { url: img.url, storageId, _id: storageId };
      }
      return null;
    })
    .filter(Boolean) as { url: string; storageId: string; _id: string }[];
};

/**
 * Handles reordering of admin profile images
 */
export const useAdminImageReorder = (profileId: string) => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return async (newOrder: (string | { _id: string | undefined })[]) => {
    if (!profileId || !token) return;

    // Extract string IDs from the order array which can contain strings or objects with _id
    const imageIds = newOrder
      .map((item) => (typeof item === "string" ? item : item._id))
      .filter(Boolean) as string[];

    try {
      // Update the order on the server (admin endpoint)
      await updateAdminProfileImageOrder({
        token,
        profileId,
        imageIds,
      });

      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["admin-profile-images", profileId],
      });

      showSuccessToast("Image order updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating admin image order", error);
      showErrorToast(error, "Failed to update image order");
      throw error;
    }
  };
};
