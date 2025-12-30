import { z } from "zod";

export const notificationsMarkReadSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "At least one notification ID is required"),
});
