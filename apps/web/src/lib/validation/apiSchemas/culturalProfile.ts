import { z } from "zod";

export const culturalProfileUpsertSchema = z.object({
  religion: z.string(),
  religiousPractice: z.string(),
  motherTongue: z.string().min(1),
  languages: z.array(z.string()),
  familyValues: z.string(),
  marriageViews: z.string(),
  traditionalValues: z.string(),
  importanceOfReligion: z.number().min(1).max(10).optional(),
  importanceOfCulture: z.number().min(1).max(10).optional(),
  familyBackground: z.string().optional(),
});
