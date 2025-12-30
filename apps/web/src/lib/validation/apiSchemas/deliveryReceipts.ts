import { z } from "zod";

export const deliveryReceiptCreateSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  status: z.enum(["delivered", "read", "failed"]),
});
