import { Sex, AnimalSize } from "@/prisma/generated/enums";
import { ANIMAL_SIZE_LABELS } from "@/app/lib/utils/enum-formatter";











export const SexOptions: { label: string; value: string }[] = [
  { label: "Macho", value: Sex.MALE },
  { label: "Hembra", value: Sex.FEMALE },
];

export const SizeOptions: { label: string; value: string }[] = (
  Object.entries(ANIMAL_SIZE_LABELS) as [AnimalSize, string][]
).map(([value, label]) => ({ label, value }));
