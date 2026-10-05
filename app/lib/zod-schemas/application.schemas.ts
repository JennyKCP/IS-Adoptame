import { z } from "zod";
import { ApplicationStatus } from "@/prisma/generated/enums";
import { cuidSchema } from "./common.schemas";
import { householdSuperRefine } from "./household-profile.schemas";
import { myAdoptionAppFieldsShape } from "./myAdoptionApplication.schema";

export const StaffUpdateAdoptionAppFormSchema = z.object({
  
  
  status: z
    .enum(ApplicationStatus, {
      error: "Invalid application status.",
    })
    .optional(),
  internalNotes: z.string().optional(),
  statusChangeReason: z.string().optional(),
});

export type StaffUpdateAdoptionAppFormInput = z.input<
  typeof StaffUpdateAdoptionAppFormSchema
>;





export const StaffAdoptionApplicationFormSchema = z
  .object({ ...myAdoptionAppFieldsShape, animalId: cuidSchema })
  .superRefine(householdSuperRefine);

export type StaffAdoptionApplicationFormInput = z.input<
  typeof StaffAdoptionApplicationFormSchema
>;
