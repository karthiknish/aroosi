import { z } from "zod";

export const imagesProfileUploadSchema = z.object({
  storageId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
});
