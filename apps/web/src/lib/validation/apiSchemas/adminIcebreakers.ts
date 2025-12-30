import { z } from "zod";

export const adminIcebreakersCreateSchema = z.object({
  text: z.string().min(3).max(300),
  category: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0).max(100).optional(),
});

export const adminIcebreakersUpdateSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(3).max(300).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    active: z.boolean().optional(),
    weight: z.number().min(0).max(100).nullable().optional(),
  })
  .refine(
    (v) => {
      const { id: _id, ...rest } = v as any;
      return Object.keys(rest).length > 0;
    },
    { message: "At least one field to update is required" }
  );

export const adminIcebreakersDeleteSchema = z.object({
  id: z.string().min(1),
});
