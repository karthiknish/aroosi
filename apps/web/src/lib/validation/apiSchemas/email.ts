import { z } from "zod";

export const welcomeEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});
