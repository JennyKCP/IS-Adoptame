import { SexOptions, SizeOptions } from "./pets-filter-options";

export interface PetFilterValues {
  query: string;
  category: string;
  color: string;
  sex: string;
  size: string;
}


const labelFor = (
  options: { label: string; value: string }[],
  value: string
) => options.find((option) => option.value === value)?.label ?? value;


export const describePetFilters = ({
  query,
  category,
  color,
  sex,
  size,
}: PetFilterValues): string[] => {
  const split = (value: string) => value.split(",").filter(Boolean);

  return [
    ...(query ? [`“${query}”`] : []),
    ...(category ? [category] : []),
    ...split(color),
    ...split(sex).map((value) => labelFor(SexOptions, value)),
    ...split(size).map((value) => labelFor(SizeOptions, value)),
  ];
};


export const joinFilterLabels = (labels: string[]): string => {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
};
