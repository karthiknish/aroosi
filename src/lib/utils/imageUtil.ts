export async function updateImageOrder({
  token,
  userId,
  imageIds,
}: {
  token: string;
  userId: string;
  imageIds: string[];
}): Promise<void> {
  const res = await fetch("/api/profile-images/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, imageIds }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Failed to update image order");
  }
}

export async function getImageUploadUrl(token: string): Promise<string> {
  const res = await fetch("/api/profile-images/upload-url", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const json = await res.json();
  if (!json.uploadUrl) throw new Error("Upload URL missing");
  return json.uploadUrl as string;
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
  if (!res.ok) throw new Error("Failed to save image metadata");
  const data = await res.json();
  const envelope = data?.data ?? data;
  if (!envelope.imageId) throw new Error("imageId missing in response");
  return { imageId: envelope.imageId as string };
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
  const res = await fetch("/api/profile-images", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, imageId }),
  });
  if (!res.ok) throw new Error("Failed to delete image");
}
