import type { AiAnimalMatchRow } from "@/app/lib/data/animals/animal.data";


export type AnimalMatch = {
  animalId: string;
  name: string;
  species: string;
  birthDate: string;
  currentUnit: string | null;
};




function formatUnit(
  unit: { name: string; location: { name: string } } | null,
): string | null {
  return unit ? `${unit.location.name} · ${unit.name}` : null;
}

export function toAnimalMatch(row: AiAnimalMatchRow): AnimalMatch {
  return {
    animalId: row.id,
    name: row.name,
    species: row.species.name,
    birthDate: row.birthDate,
    currentUnit: formatUnit(row.currentUnit),
  };
}
