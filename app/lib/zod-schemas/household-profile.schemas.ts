import { z } from "zod";
import { LivingSituation } from "@/prisma/generated/enums";
import { requiredNumber } from "./common.schemas";


export const RENTING_SITUATIONS = [
  LivingSituation.RENT_APARTMENT,
  LivingSituation.RENT_HOUSE,
] as const;

export const isRenting = (value: LivingSituation | string | undefined) =>
  RENTING_SITUATIONS.includes(value as (typeof RENTING_SITUATIONS)[number]);


















export const householdFieldsShape = {
  livingSituation: z.enum(LivingSituation, {
    error: (issue) =>
      issue.input === undefined ? "Living situation is required." : undefined,
  }),

  
  hasYard: z.enum(["true", "false"], {
    error: (issue) =>
      issue.input === undefined ? "Yard information is required." : undefined,
  }),

  
  
  
  
  
  
  landlordPermission: z.enum(["true", "false"]).optional(),

  
  
  householdSize: requiredNumber("Household size")
    .int({ error: "Household size must be a whole number." })
    .min(1, { error: "Household size must be between 1 and 50." })
    .max(50, { error: "Household size must be between 1 and 50." }),

  hasChildren: z.enum(["true", "false"], {
    error: (issue) =>
      issue.input === undefined
        ? "Children information is required."
        : undefined,
  }),

  
  childrenAges: z.string().regex(/^[\d\s,]*$/, {
    error: "Ages must be a comma-separated list of numbers.",
  }),

  otherAnimalsDescription: z.string().optional(),
  animalExperience: z
    .string()
    .min(1, { error: "Animal experience is required" }),
};




type HouseholdRefineInput = {
  livingSituation: LivingSituation;
  landlordPermission?: "true" | "false";
  hasChildren: "true" | "false";
  childrenAges: string;
};

export const householdSuperRefine = (
  data: HouseholdRefineInput,
  ctx: z.RefinementCtx,
) => {
  if (data.hasChildren === "false" && data.childrenAges.trim().length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["childrenAges"],
      message: "If 'No children' is selected, ages should not be provided.",
    });
  }
  if (data.hasChildren === "true" && data.childrenAges.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["childrenAges"],
      message: "Please provide the ages of the children if 'Yes' is selected.",
    });
  }
  if (isRenting(data.livingSituation) && data.landlordPermission === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["landlordPermission"],
      message: "Landlord permission is required when renting.",
    });
  }
};

export const HouseholdFieldsSchema = z
  .object(householdFieldsShape)
  .superRefine(householdSuperRefine);

export type HouseholdFieldsInput = z.input<typeof HouseholdFieldsSchema>;
export type HouseholdFieldsOutput = z.output<typeof HouseholdFieldsSchema>;


export const toHouseholdData = (data: HouseholdFieldsOutput) => ({
  livingSituation: data.livingSituation,
  hasYard: data.hasYard === "true",
  
  landlordPermission: isRenting(data.livingSituation)
    ? data.landlordPermission === "true"
    : null,
  householdSize: data.householdSize,
  hasChildren: data.hasChildren === "true",
  childrenAges:
    data.childrenAges.trim() === ""
      ? []
      : data.childrenAges
          .split(",")
          .map((age) => age.trim())
          .filter((age) => age.length > 0)
          .map((age) => parseInt(age, 10)),
  otherAnimalsDescription: data.otherAnimalsDescription || null,
  animalExperience: data.animalExperience,
});






export const householdEditStamp = (editorPersonId: string) => ({
  lastEditedById: editorPersonId,
  lastEditedAt: new Date(),
});
