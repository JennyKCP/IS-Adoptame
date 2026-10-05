import type {
  AnimalHealthStatus,
  AnimalListingStatus,
  AnimalSize,
  FosterPlacementType,
  IntakeType,
  Sex,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/prisma/generated/enums";
import type { AiAnimalSummaryRow } from "@/app/lib/data/animals/animal.data";
import type { ReadinessLine } from "./animal-readiness";


export type AnimalSummary = {
  animalId: string;
  name: string;
  species: string;
  breeds: string[];
  primaryColor: string | null;
  sex: Sex;
  birthDate: string;
  size: AnimalSize | null;
  healthStatus: AnimalHealthStatus | null;
  listingStatus: AnimalListingStatus;
  currentUnit: string | null;
  currentFoster: {
    personId: string;
    personName: string;
    placementType: FosterPlacementType;
    startDate: string;
    expectedEndDate: string | null;
  } | null;
  openTasks: AnimalSummaryTask[];
  latestIntake: { date: string; type: IntakeType } | null;
  
  readiness: ReadinessLine | null;
};

export type AnimalSummaryTask = {
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
};

function formatUnit(
  unit: { name: string; location: { name: string } } | null,
): string | null {
  return unit ? `${unit.location.name} · ${unit.name}` : null;
}

export function toAnimalSummary(
  row: AiAnimalSummaryRow,
  readiness: ReadinessLine | null,
): AnimalSummary {
  const foster = row.fosterPlacements[0] ?? null;

  return {
    animalId: row.id,
    name: row.name,
    species: row.species.name,
    breeds: row.breeds.map((b) => b.name),
    primaryColor: row.primaryColor?.name ?? null,
    sex: row.sex,
    birthDate: row.birthDate,
    size: row.size,
    healthStatus: row.healthStatus,
    listingStatus: row.listingStatus,
    currentUnit: formatUnit(row.currentUnit),
    currentFoster: foster
      ? {
          personId: foster.fosterProfile.person.id,
          personName: foster.fosterProfile.person.name,
          placementType: foster.type,
          startDate: foster.startDate,
          expectedEndDate: foster.expectedEndDate,
        }
      : null,
    openTasks: row.tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
    })),
    latestIntake: row.intake[0]
      ? {
          date: row.intake[0].intakeDate,
          type: row.intake[0].type,
        }
      : null,
    readiness,
  };
}
