import { z } from "zod";

export const profileImagesPostSchema = z
  .object({
    storageId: z.string().min(1, "storageId is required"),
    fileName: z.string().min(1, "fileName is required"),
    contentType: z.string().min(1, "contentType is required"),
    size: z.number().optional(),
    fileSize: z.number().optional(), // legacy support
  })
  .refine((data) => typeof data.size === "number" || typeof data.fileSize === "number", {
    message: "size or fileSize is required",
  });

export const profileImagesDeleteSchema = z
  .object({
    storageId: z.string().optional(),
    imageId: z.string().optional(), // legacy support
  })
  .refine((data) => data.storageId || data.imageId, {
    message: "storageId or imageId is required",
  });

export const profileImagesOrderSchema = z.object({
  profileId: z.string().optional(),
  imageIds: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(), // mobile alias
  skipUrlReorder: z.boolean().optional(),
  rebuildUrls: z.boolean().optional(),
});

export const profileImagesMainSchema = z.object({
  imageId: z.string().min(1),
});
