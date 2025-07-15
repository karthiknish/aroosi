export async function updateImageOrder({
  token,
  userId,
  profileId,
  imageIds,
}: {
  token: string;
  userId?: string;
  profileId?: string;
  imageIds: string[];
}): Promise<void> {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    if (!imageIds || imageIds.length === 0) {
      throw new Error("Image IDs are required");
    }

    const res = await fetch("/api/profile-images/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        profileId: profileId || userId,
        imageIds,
      }),
    });

    if (!res.ok) {
      let errorMessage = "Failed to update image order";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await res.text().catch(() => "");
        errorMessage = errorText || errorMessage;
      }

      if (res.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (res.status === 403) {
        throw new Error("You don't have permission to update image order.");
      } else if (res.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error updating image order:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while updating image order");
  }
}

export async function getImageUploadUrl(token: string): Promise<string> {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch("/api/profile-images/upload-url", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      let errorMessage = "Failed to get upload URL";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = res.statusText || errorMessage;
      }

      if (res.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (res.status === 403) {
        throw new Error("You don't have permission to upload images.");
      } else if (res.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(errorMessage);
    }

    const json = await res.json();
    if (!json.uploadUrl) {
      throw new Error("Upload URL missing from server response");
    }

    return json.uploadUrl as string;
  } catch (error) {
    console.error("Error getting image upload URL:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while getting upload URL");
  }
}

export async function saveImageMeta({
  token,
  userId,
  storageId,
  fileName,
  contentType,
  fileSize,
}: {
  token: string;
  userId: string;
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ imageId: string }> {
  try {
    // Validate required parameters
    if (!token) {
      throw new Error("Authentication token is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!storageId) {
      throw new Error("Storage ID is required");
    }
    if (!fileName) {
      throw new Error("File name is required");
    }
    if (!contentType) {
      throw new Error("Content type is required");
    }
    if (!fileSize || fileSize <= 0) {
      throw new Error("Valid file size is required");
    }

    const res = await fetch("/api/profile-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        storageId,
        fileName,
        contentType,
        fileSize,
      }),
    });

    if (!res.ok) {
      let errorMessage = "Failed to save image metadata";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await res.text().catch(() => "");
        errorMessage = errorText || errorMessage;
      }

      if (res.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (res.status === 403) {
        throw new Error("You don't have permission to save image metadata.");
      } else if (res.status === 413) {
        throw new Error("Image file is too large.");
      } else if (res.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(errorMessage);
    }

    const data = await res.json();
    const envelope = data?.data ?? data;

    if (!envelope || !envelope.imageId) {
      throw new Error("Invalid response: imageId missing from server response");
    }

    return { imageId: envelope.imageId as string };
  } catch (error) {
    console.error("Error saving image metadata:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while saving image metadata");
  }
}

export async function deleteImageById({
  token,
  userId,
  imageId,
}: {
  token: string;
  userId: string;
  imageId: string;
}): Promise<void> {
  try {
    // Validate required parameters
    if (!token) {
      throw new Error("Authentication token is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!imageId) {
      throw new Error("Image ID is required");
    }

    const res = await fetch("/api/profile-images", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, imageId }),
    });

    if (!res.ok) {
      let errorMessage = "Failed to delete image";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await res.text().catch(() => "");
        errorMessage = errorText || errorMessage;
      }

      if (res.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (res.status === 403) {
        throw new Error("You don't have permission to delete this image.");
      } else if (res.status === 404) {
        throw new Error("Image not found or already deleted.");
      } else if (res.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while deleting image");
  }
}
