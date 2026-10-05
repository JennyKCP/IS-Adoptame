import {
  IntakeType,
  Sex,
  AnimalHealthStatus,
  AnimalListingStatus,
  AnimalSize,
  TaskCategory,
  TaskStatus,
  TaskPriority,
  NoteCategory,
  LivingSituation,
  OutcomeType,
  LocationType,
  FosterPlacementType,
  FosterReturnReason
} from "@/prisma/generated/enums";
import { EffectiveApplicationStatus } from "./derive-application-status";


function formatEnumForDisplay<T extends string>(enumObject: {
  [key: string]: T;
}): string[] {
  return Object.values(enumObject).map((value: T) => {
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  });
}


function formatEnumAsOptions<T extends string>(enumObject: {
  [key: string]: T;
}): { value: T; label: string }[] {
  return Object.entries(enumObject).map(([_key, value]) => ({
    value: value, 
    label: value 
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" "),
  }));
}


export const formatSingleEnumOption = (type: string | null | undefined) => {
  if (!type) return "N/A";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const ANIMAL_SIZE_LABELS: Record<AnimalSize, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  XLARGE: "Extra Large",
};


export const formatAnimalSize = (
  size: AnimalSize | null | undefined,
): string | null => (size ? ANIMAL_SIZE_LABELS[size] : null);

export const formattedIntakeTypes = formatEnumForDisplay(IntakeType);
export const formattedSexes = formatEnumForDisplay(Sex);
export const formattedPetHealthStatuses =
  formatEnumForDisplay(AnimalHealthStatus);

export const intakeTypeOptions = formatEnumAsOptions(IntakeType);
export const animalSexOptions = formatEnumAsOptions(Sex);
export const animalSizeOptions = Object.entries(ANIMAL_SIZE_LABELS).map(
  ([value, label]) => ({ value: value as AnimalSize, label }),
);
export const animalHealthStatusOptions =
  formatEnumAsOptions(AnimalHealthStatus);
export const animalListingStatusOptions =
  formatEnumAsOptions(AnimalListingStatus);

export const TaskCategoryOptions = formatEnumAsOptions(TaskCategory);
export const TaskStatusOptions = formatEnumAsOptions(TaskStatus);
export const TaskPriorityOptions = formatEnumAsOptions(TaskPriority);

export const noteCategoryOptions = formatEnumAsOptions(NoteCategory);

export const livingSituationOptions = formatEnumAsOptions(LivingSituation);


export const myApplicationStatusOptions = formatEnumAsOptions(
  EffectiveApplicationStatus,
);

export const userApplicationStatusOptions = formatEnumAsOptions(
  EffectiveApplicationStatus,
);

export const outcomeTypeOptions = formatEnumAsOptions(OutcomeType)

export const locationTypeOptions = formatEnumAsOptions(LocationType);

export const fosterPlacementTypeOptions = formatEnumAsOptions(FosterPlacementType);
export const fosterReturnReasonOptions = formatEnumAsOptions(FosterReturnReason);