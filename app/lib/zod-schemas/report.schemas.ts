import { z } from "zod";


export const ReportParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  species: z.string().max(200).optional(), 
});

export type ReportParams = z.infer<typeof ReportParamsSchema>;
