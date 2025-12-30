import { z } from "zod";

export const recordProfileViewSchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
});
