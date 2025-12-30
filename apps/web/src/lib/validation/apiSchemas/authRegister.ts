import { z } from "zod";

// Supports two modes:
// 1) Client-side auth (mobile): { uid, email, displayName } -> Syncs to Firestore
// 2) Server-side auth (web): { password, email, displayName } -> Creates Auth User + Firestore
export const authRegisterSchema = z
  .object({
    uid: z.string().optional(),
    email: z.string().email("Invalid email"),
    displayName: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  })
  .refine((data) => data.uid || data.password, {
    message:
      "Either uid (for client-side auth) or password (for server-side auth) is required",
  });
