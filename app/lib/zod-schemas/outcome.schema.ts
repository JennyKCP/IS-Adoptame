import { z } from "zod";
import { OutcomeType } from "@/prisma/generated/enums";
import { calendarDaySchema } from "./common.schemas";

export const OutcomeFormSchema = z
  .object({
    outcomeDate: calendarDaySchema("An outcome date"),
    outcomeType: z.enum(OutcomeType, {
      error: (issue) =>
        issue.input === undefined ? "An outcome type is required." : undefined,
    }),
    destinationPartnerId: z.string().optional(),
    ownerId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      
      if (data.outcomeType === "TRANSFER_OUT") {
        return !!data.destinationPartnerId;
      }
      return true;
    },
    {
      path: ["destinationPartnerId"], 
      error: "A destination partner is required for transfers.",
    }
  )
  .refine(
    (data) => {
      
      if (data.outcomeType === "RETURN_TO_OWNER") {
        return !!data.ownerId;
      }
      return true;
    },
    {
      path: ["ownerId"], 
      error: "An owner is required for return-to-owner outcomes.",
    }
  );

export type OutcomeFormInput = z.input<typeof OutcomeFormSchema>;
export type OutcomeFormOutput = z.output<typeof OutcomeFormSchema>;




export const REVERSAL_REASON_MAX_LENGTH = 1000;




export const ReverseOutcomeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: "A reason for reversing this outcome is required." })
    .max(REVERSAL_REASON_MAX_LENGTH, {
      error: `The reason cannot exceed ${REVERSAL_REASON_MAX_LENGTH} characters.`,
    }),
});

export type ReverseOutcomeInput = z.input<typeof ReverseOutcomeSchema>;