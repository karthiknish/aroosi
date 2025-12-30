import { z } from "zod";

export const familyRelationshipSchema = z.enum([
  "father",
  "mother",
  "brother",
  "sister",
  "uncle",
  "aunt",
  "grandfather",
  "grandmother",
  "cousin",
  "guardian",
  "other",
]);

export const familyApprovalRequestCreateSchema = z.object({
  familyMemberId: z.string().min(1),
  relationship: familyRelationshipSchema,
  message: z.string().min(1),
});

export const familyApprovalRespondSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approved", "denied"]),
  responseMessage: z.string().optional(),
});
