import { z } from "zod";

export const adminSendEmailBodySchema = z.object({
  dryRun: z.boolean().optional(),
  confirm: z.boolean().optional(),
  templateId: z.string().min(1).optional(),

  from: z.string().min(1).max(200).optional(),
  to: z.array(z.string().email()).optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),

  subject: z.string().min(1).max(200),
  text: z.string().optional(),
  html: z.string().optional(),

  preheader: z.string().max(200).optional(),
  headers: z.record(z.string()).optional(),
  attachments: z.array(z.object({ filename: z.string().min(1), content: z.string().optional() })).optional(),
}).superRefine((v, ctx) => {
  if (!v.html && !v.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either html or text content is required",
      path: ["html"],
    });
  }
});
