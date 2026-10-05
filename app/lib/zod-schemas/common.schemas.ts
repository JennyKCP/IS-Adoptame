import { z } from "zod";
import { US_STATES } from "@/app/lib/constants/us-states";
import { parseCalendarDay, type CalendarDay } from "@/app/lib/utils/shelter-day";

export const searchQuerySchema = z.string().trim().max(100, {
  error: "Query cannot exceed 100 characters.",
});

const stateCodes = US_STATES.map((s) => s.code) as [string, ...string[]];


export const usStateSchema = z.enum(stateCodes, {
  error: "Please select a valid US state.",
});


export const optionalUsStateSchema = z
  .string()
  .optional()
  .refine((val) => !val || stateCodes.includes(val), {
    error: "Please select a valid US state.",
  });


export const cuidSchema = z.cuid2({
  error: "Invalid ID format. Expected a CUID.",
});


export const authIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64, { error: "Invalid ID format." });


export const currentPageSchema = z.int().positive({
  error: "Page number must be a positive integer.",
});

export const pageSizeSchema = z.coerce
  .number()
  .transform((val) => ([10, 20, 30, 40, 50].includes(val) ? val : 10));

export const SignInFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters." }),
});

export type SignInFormInput = z.input<typeof SignInFormSchema>;

export const requiredNumber = (label: string) =>
  z.number({
    error: (issue) =>
      issue.input === undefined || issue.input === null
        ? `${label} is required.`
        : `${label} must be a number.`,
  });


export const calendarDaySchema = (label: string) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${label} is required.` : undefined,
    })
    .transform((value, ctx): CalendarDay => {
      const day = parseCalendarDay(value);
      if (day === null) {
        ctx.addIssue({ code: "custom", message: `${label} is required.` });
        return z.NEVER;
      }
      return day;
    });
