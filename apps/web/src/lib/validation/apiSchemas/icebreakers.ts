import { z } from "zod";

export const icebreakerAnswerSchema = z.object({
  questionId: z.string().min(1, "questionId is required"),
  answer: z.string().min(1, "answer is required").max(500, "answer too long"),
});
