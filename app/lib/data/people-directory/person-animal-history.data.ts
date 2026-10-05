import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import { cuidSchema } from "../../zod-schemas/common.schemas";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";
import { ANIMAL_IMAGE_ORDER } from "../../utils/animal-image-order";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
} from "../application-status.data";
import {
  calendarDay,
  startOfShelterDay,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";

export type PersonAnimalHistoryRole =
  | "SURRENDERER"
  | "FINDER"
  | "OWNER_RECLAIMED"
  | "APPLICANT"
  | "FOSTER_CARER";

export type PersonAnimalHistoryEntry = {
  role: PersonAnimalHistoryRole;
  
  date: Date | null;
  
  day?: CalendarDay;
  animal: {
    id: string;
    name: string;
    species: { name: string };
    animalImages: { url: string }[];
    listingStatus: string;
  };
  
  
  applicationStatus?: string;
  
  
  
  reversed?: boolean;
};


const dated = (day: CalendarDay, timezone: string) => ({ day, date: startOfShelterDay(day, timezone) });

const animalSelect = {
  id: true,
  name: true,
  listingStatus: true,
  species: { select: { name: true } },
  animalImages: {
    select: { url: true },
    orderBy: ANIMAL_IMAGE_ORDER,
    take: 1,
  },
} as const;

const _fetchPersonAnimalHistory = async (
  inputPersonId: string
): Promise<{ history: PersonAnimalHistoryEntry[] }> => {
  const parsedId = cuidSchema.safeParse(inputPersonId);

  if (!parsedId.success) {
    throw new Error("Invalid person ID format.");
  }

  const personId = parsedId.data;

  try {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: {
        surrenderedAnimals: {
          select: {
            intakeDate: true,
            animal: { select: animalSelect },
          },
        },
        foundAnimals: {
          select: {
            intakeDate: true,
            animal: { select: animalSelect },
          },
        },
        reclaimedAnimalsAsOwner: {
          select: {
            outcomeDate: true,
            reversedAt: true,
            animal: { select: animalSelect },
          },
        },
        adoptionApplications: {
          select: {
            ...DERIVATION_APPLICATION_SELECT,
            animal: { select: animalSelect },
          },
        },
        fosterProfile: {
          select: {
            placements: {
              select: {
                startDate: true,
                animal: { select: animalSelect },
              },
            },
          },
        },
      },
    });

    if (!person) {
      return { history: [] };
    }

    const timezone = (await getShelterSettings()).timezone;
    const applicationStatuses = await effectiveApplicationStatuses(
      person.adoptionApplications,
    );
    const history: PersonAnimalHistoryEntry[] = [
      ...person.surrenderedAnimals.map((intake) => ({
        role: "SURRENDERER" as const,
        ...dated(calendarDay(intake.intakeDate), timezone),
        animal: intake.animal,
      })),
      ...person.foundAnimals.map((intake) => ({
        role: "FINDER" as const,
        ...dated(calendarDay(intake.intakeDate), timezone),
        animal: intake.animal,
      })),
      ...person.reclaimedAnimalsAsOwner.map((outcome) => ({
        role: "OWNER_RECLAIMED" as const,
        ...dated(calendarDay(outcome.outcomeDate), timezone),
        animal: outcome.animal,
        reversed: outcome.reversedAt !== null,
      })),
      ...person.adoptionApplications.map((application) => ({
        role: "APPLICANT" as const,
        date: application.submittedAt,
        animal: application.animal,
        applicationStatus: applicationStatuses.get(application.id),
      })),
      ...(person.fosterProfile?.placements.map((placement) => ({
        role: "FOSTER_CARER" as const,
        ...dated(calendarDay(placement.startDate), timezone),
        animal: placement.animal,
      })) ?? []),
    ];

    
    history.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });

    return { history };
  } catch (error) {
    console.error("Error fetching person animal history.", error);
    throw new Error("Could not fetch person animal history.");
  }
};

export const fetchPersonAnimalHistory = RequirePermission(
  AppPermissions.PERSONS_READ
)(_fetchPersonAnimalHistory);