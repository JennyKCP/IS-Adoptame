import { AnimalHealthStatus, IntakeType } from "@/prisma/generated/enums";
import { z } from "zod";
import { calendarDaySchema, optionalUsStateSchema } from "./common.schemas";






export const intakeFieldsShape = {
  intakeType: z.enum(IntakeType),
  intakeDate: calendarDaySchema("An intake date"),
  notes: z.string().optional(),
  sourcePartnerId: z.cuid2().optional().or(z.literal("")),
  
  
  
  foundAddress: z.string().optional(),
  foundCity: z.string().optional(),
  foundState: optionalUsStateSchema,
  surrenderingPersonId: z.cuid2().optional().or(z.literal("")),
};



type IntakeRefineInput = {
  intakeType?: IntakeType;
  sourcePartnerId?: string;
  foundAddress?: string;
  foundCity?: string;
  foundState?: string;
  surrenderingPersonId?: string;
};

export const intakeSuperRefine = (
  data: IntakeRefineInput,
  ctx: z.RefinementCtx,
) => {
  if (data.intakeType === IntakeType.TRANSFER_IN && !data.sourcePartnerId) {
    ctx.addIssue({
      code: "custom",
      message: "Source partner is required for transfers.",
      path: ["sourcePartnerId"],
    });
  }

  if (data.intakeType === IntakeType.OWNER_SURRENDER && !data.surrenderingPersonId) {
    ctx.addIssue({
      code: "custom",
      message: "A surrendering person is required.",
      path: ["surrenderingPersonId"],
    });
  }

  if (data.intakeType === IntakeType.STRAY) {
    if (!data.foundAddress) {
      ctx.addIssue({
        code: "custom",
        message: "Address is required for strays.",
        path: ["foundAddress"],
      });
    }
    if (!data.foundCity) {
      ctx.addIssue({
        code: "custom",
        message: "City is required for strays.",
        path: ["foundCity"],
      });
    }
    if (!data.foundState) {
      ctx.addIssue({
        code: "custom",
        message: "State is required for strays.",
        path: ["foundState"],
      });
    }
  }
};





export const IntakeFieldsSchema = z.object(intakeFieldsShape).partial();




export type IntakeFieldsValues = z.input<typeof IntakeFieldsSchema>;









export const ReIntakeFormSchema = z
  .object({
    ...intakeFieldsShape,
    healthStatus: z.enum(AnimalHealthStatus),
    
    
    
    isSpayedNeutered: z.boolean(),
  })
  .superRefine(intakeSuperRefine);

export type ReIntakeFormInput = z.input<typeof ReIntakeFormSchema>;
export type ReIntakeFormOutput = z.output<typeof ReIntakeFormSchema>;






export const IntakeCorrectionFormSchema = z
  .object(intakeFieldsShape)
  .superRefine(intakeSuperRefine);

export type IntakeCorrectionFormInput = z.input<
  typeof IntakeCorrectionFormSchema
>;
export type IntakeCorrectionFormOutput = z.output<
  typeof IntakeCorrectionFormSchema
>;
