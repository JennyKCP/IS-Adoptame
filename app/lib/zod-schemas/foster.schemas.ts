import { z } from "zod";
import {
  ApplicationStatus,
  FosterPlacementType,
  FosterReturnReason,
} from "@/prisma/generated/enums";
import {
  calendarDaySchema,
  cuidSchema,
  requiredNumber,
  usStateSchema,
} from "./common.schemas";
import { isFosterPlacementOverdue } from "@/app/lib/utils/date-utils";
import type { CalendarDay } from "@/app/lib/utils/shelter-day";
import {
  householdFieldsShape,
  householdSuperRefine,
} from "./household-profile.schemas";





export const fosterCapabilityFieldsShape = {
  
  
  speciesIds: z
    .array(cuidSchema)
    .min(1, { error: "Select at least one species you can foster." }),
  maxAnimals: requiredNumber("Max animals")
    .int({ error: "Max animals must be a positive whole number." })
    .min(1, { error: "Max animals must be a positive whole number." }),
  hasQuarantineSpace: z.enum(["true", "false"]).optional(),
  canGiveOralMeds: z.enum(["true", "false"]).optional(),
  canBottleFeed: z.enum(["true", "false"]).optional(),
  canTransport: z.enum(["true", "false"]).optional(),
  acceptsMedical: z.enum(["true", "false"]).optional(),
  acceptsHospice: z.enum(["true", "false"]).optional(),
  availabilityNotes: z
    .string()
    .max(1000, {
      error: "Availability notes cannot exceed 1000 characters.",
    })
    .optional(),
};

export const FosterCapabilityFieldsSchema = z.object(
  fosterCapabilityFieldsShape,
);

export type FosterCapabilityFieldsInput = z.input<
  typeof FosterCapabilityFieldsSchema
>;
export type FosterCapabilityFieldsOutput = z.output<
  typeof FosterCapabilityFieldsSchema
>;


export const toFosterCapabilityData = (data: FosterCapabilityFieldsOutput) => {
  const toBool = (value: "true" | "false" | undefined) =>
    value === undefined ? undefined : value === "true";

  return {
    maxAnimals: data.maxAnimals,
    hasQuarantineSpace: toBool(data.hasQuarantineSpace),
    canGiveOralMeds: toBool(data.canGiveOralMeds),
    canBottleFeed: toBool(data.canBottleFeed),
    canTransport: toBool(data.canTransport),
    acceptsMedical: toBool(data.acceptsMedical),
    acceptsHospice: toBool(data.acceptsHospice),
    availabilityNotes: data.availabilityNotes?.trim()
      ? data.availabilityNotes
      : null,
  };
};




const fosterApplicantFieldsShape = {
  applicantName: z.string().min(1, { error: "Applicant name is required." }),
  applicantEmail: z.email({ error: "Invalid email address." }),
  applicantPhone: z.string().min(1, { error: "Applicant phone is required." }),
  applicantAddressLine1: z
    .string()
    .min(1, { error: "Address Line 1 is required." }),
  applicantAddressLine2: z.string().optional(),
  applicantCity: z.string().min(1, { error: "City is required." }),
  applicantState: usStateSchema,
  applicantZipCode: z.string().regex(/^\d{5}$/, { error: "Invalid ZIP code." }),
};





export const FosterApplicationFormSchema = z
  .object({
    ...householdFieldsShape,
    ...fosterApplicantFieldsShape,
    ...fosterCapabilityFieldsShape,
  })
  .superRefine(householdSuperRefine);

export type FosterApplicationFormInput = z.input<
  typeof FosterApplicationFormSchema
>;

export const FosterApplicationStatusChangeSchema = z.object({
  applicationId: cuidSchema,
  status: z.enum(ApplicationStatus, {
    error: "Invalid application status.",
  }),
  statusChangeReason: z.string().min(1, {
    error: "A reason for the status change is required.",
  }),
});

export type FosterApplicationStatusChangeInput = z.input<
  typeof FosterApplicationStatusChangeSchema
>;


export const createFosterPlacementSchema = (today: CalendarDay) =>
  z.object({
    animalId: cuidSchema,
    fosterProfileId: cuidSchema,
    type: z.enum(FosterPlacementType, {
      error: (issue) =>
        issue.input === undefined ? "A placement type is required." : undefined,
    }),
    
    
    
    
    
    expectedEndDate: calendarDaySchema("An expected return date")
      .refine((day) => !isFosterPlacementOverdue(day, today), {
        error: "An expected return date cannot be in the past.",
      })
      .nullish(),
    notes: z.string().optional(),
  });


export type CreateFosterPlacementSchema = ReturnType<
  typeof createFosterPlacementSchema
>;






export const OUTCOME_RETURN_REASONS: readonly FosterReturnReason[] = [
  FosterReturnReason.ADOPTED_BY_FOSTER,
  FosterReturnReason.ENDED_BY_OUTCOME,
];

export const ReturnFromFosterSchema = z.object({
  placementId: cuidSchema,
  returnReason: z
    .enum(FosterReturnReason, {
      error: (issue) =>
        issue.input === undefined ? "A return reason is required." : undefined,
    })
    .refine((reason) => !OUTCOME_RETURN_REASONS.includes(reason), {
      error: "That reason is recorded by an outcome, not by a return.",
    }),
  returnNotes: z.string().optional(),
  unitId: cuidSchema,
});

export const ConvertFosterToAdoptionSchema = z.object({
  placementId: cuidSchema,
  adoptionApplicationId: cuidSchema.optional(),
});



export const CreateFosterProfileSchema = z.object({
  personId: cuidSchema,
  ...fosterCapabilityFieldsShape,
});

export type CreateFosterProfileInput = z.input<
  typeof CreateFosterProfileSchema
>;
