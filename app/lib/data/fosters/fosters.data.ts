import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import {
  AnimalListingStatus,
  ApplicationStatus,
  FosterStatus,
} from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import { z } from "zod";
import {
  cuidSchema,
  currentPageSchema,
  pageSizeSchema,
  searchQuerySchema,
} from "../../zod-schemas/common.schemas";
import { RequirePermission } from "../../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { computeStays, type StayEvent } from "@/app/lib/utils/stay-utils";
import { calendarDay } from "@/app/lib/utils/shelter-day";
import { ANIMAL_IMAGE_ORDER } from "@/app/lib/utils/animal-image-order";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
} from "@/app/lib/data/application-status.data";

export type FosterPickerOption = {
  id: string;
  personName: string;
  maxAnimals: number;
  openPlacementsCount: number;
};




const _fetchFostersForPicker = async (): Promise<FosterPickerOption[]> => {
  try {
    const profiles = await prisma.fosterProfile.findMany({
      where: { status: FosterStatus.ACTIVE },
      select: {
        id: true,
        maxAnimals: true,
        person: { select: { name: true } },
        _count: { select: { placements: { where: { endDate: null } } } },
      },
      orderBy: { person: { name: "asc" } },
    });

    return profiles
      .map((profile) => ({
        id: profile.id,
        personName: profile.person.name,
        maxAnimals: profile.maxAnimals,
        openPlacementsCount: profile._count.placements,
      }))
      .filter((profile) => profile.openPlacementsCount < profile.maxAnimals);
  } catch (error) {
    console.error("Error fetching fosters for picker.", error);
    throw new Error("Error fetching fosters for picker.");
  }
};



export type FosterableAnimalOption = {
  id: string;
  name: string;
  speciesName: string;
  breed: string | null;
  birthDate: string;
  thumbnailUrl: string | null; 
};








const _fetchAnimalsEligibleForFosterPlacement = async (): Promise<
  FosterableAnimalOption[]
> => {
  try {
    const animals = await prisma.animal.findMany({
      where: {
        listingStatus: { not: AnimalListingStatus.ARCHIVED },
        fosterPlacements: { none: { endDate: null } },
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        species: { select: { name: true } },
        breeds: { select: { name: true }, take: 1, orderBy: { name: "asc" } },
        animalImages: {
          select: { url: true },
          take: 1,
          orderBy: ANIMAL_IMAGE_ORDER,
        },
        intake: { select: { intakeDate: true } },
        Outcome: { where: { reversedAt: null }, select: { outcomeDate: true } },
      },
      orderBy: { name: "asc" },
    });

    const today = await getShelterToday();
    return animals
      .filter((animal) => {
        const events: StayEvent[] = [
          ...animal.intake.map(
            (intake): StayEvent => ({
              kind: "intake",
              date: calendarDay(intake.intakeDate),
            }),
          ),
          ...animal.Outcome.map(
            (outcome): StayEvent => ({
              kind: "outcome",
              date: calendarDay(outcome.outcomeDate),
            }),
          ),
        ];
        return computeStays(events, today).isInCare;
      })
      .map((animal) => ({
        id: animal.id,
        name: animal.name,
        speciesName: animal.species.name,
        breed: animal.breeds[0]?.name ?? null,
        birthDate: animal.birthDate,
        thumbnailUrl: animal.animalImages[0]?.url ?? null,
      }));
  } catch (error) {
    console.error(
      "Error fetching animals eligible for foster placement.",
      error,
    );
    throw new Error("Error fetching animals eligible for foster placement.");
  }
};

export type AnimalForFosterPlacement = {
  id: string;
  name: string;
  listingStatus: AnimalListingStatus;
  currentUnitId: string | null;
  isInCare: boolean;
  hasOpenPlacement: boolean;
};





const _fetchAnimalForFosterPlacement = async (
  animalId: string,
): Promise<AnimalForFosterPlacement | null> => {
  const parsedId = cuidSchema.safeParse(animalId);
  if (!parsedId.success) {
    return null;
  }

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        name: true,
        listingStatus: true,
        currentUnitId: true,
        intake: { select: { intakeDate: true } },
        Outcome: { where: { reversedAt: null }, select: { outcomeDate: true } },
        fosterPlacements: { where: { endDate: null }, select: { id: true } },
      },
    });

    if (!animal) return null;

    const events: StayEvent[] = [
      ...animal.intake.map(
        (intake): StayEvent => ({
          kind: "intake",
          date: calendarDay(intake.intakeDate),
        }),
      ),
      ...animal.Outcome.map(
        (outcome): StayEvent => ({
          kind: "outcome",
          date: calendarDay(outcome.outcomeDate),
        }),
      ),
    ];

    return {
      id: animal.id,
      name: animal.name,
      listingStatus: animal.listingStatus,
      currentUnitId: animal.currentUnitId,
      isInCare: computeStays(events, await getShelterToday()).isInCare,
      hasOpenPlacement: animal.fosterPlacements.length > 0,
    };
  } catch (error) {
    console.error("Error fetching animal for foster placement.", error);
    throw new Error("Error fetching animal for foster placement.");
  }
};

export type FosterProfileForPlacement = {
  id: string;
  status: FosterStatus;
  maxAnimals: number;
  openPlacementsCount: number;
  personId: string;
  personName: string;
};


const _fetchFosterProfileForPlacement = async (
  fosterProfileId: string,
): Promise<FosterProfileForPlacement | null> => {
  const parsedId = cuidSchema.safeParse(fosterProfileId);
  if (!parsedId.success) {
    return null;
  }

  try {
    const profile = await prisma.fosterProfile.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        status: true,
        maxAnimals: true,
        personId: true,
        person: { select: { name: true } },
        _count: { select: { placements: { where: { endDate: null } } } },
      },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      status: profile.status,
      maxAnimals: profile.maxAnimals,
      openPlacementsCount: profile._count.placements,
      personId: profile.personId,
      personName: profile.person.name,
    };
  } catch (error) {
    console.error("Error fetching foster profile for placement.", error);
    throw new Error("Error fetching foster profile for placement.");
  }
};



export type FosterPlacementForAction = Prisma.FosterPlacementGetPayload<{
  include: {
    animal: { select: { id: true; name: true } };
    fosterProfile: {
      include: { person: { select: { id: true; name: true } } };
    };
    previousUnit: {
      include: { location: { select: { id: true; name: true } } };
    };
  };
}>;



const _fetchFosterPlacementById = async (
  placementId: string,
): Promise<FosterPlacementForAction | null> => {
  const parsedId = cuidSchema.safeParse(placementId);
  if (!parsedId.success) {
    return null;
  }

  try {
    return await prisma.fosterPlacement.findUnique({
      where: { id: parsedId.data },
      include: {
        animal: { select: { id: true, name: true } },
        fosterProfile: {
          include: { person: { select: { id: true, name: true } } },
        },
        previousUnit: {
          include: { location: { select: { id: true, name: true } } },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching foster placement.", error);
    throw new Error("Error fetching foster placement.");
  }
};

export type ApprovedFosterApplicationOption = {
  id: string;
  applicantName: string;
};







const _fetchApprovedFosterApplications = async (
  personId: string,
  animalId: string,
): Promise<ApprovedFosterApplicationOption[]> => {
  const applications = await prisma.adoptionApplication.findMany({
    where: { applicantId: personId, animalId },
    select: { ...DERIVATION_APPLICATION_SELECT, applicantName: true },
  });
  if (applications.length === 0) {
    return [];
  }

  const statuses = await effectiveApplicationStatuses(applications);
  return applications
    .filter(
      (application) =>
        statuses.get(application.id) === ApplicationStatus.APPROVED,
    )
    .map(({ id, applicantName }) => ({ id, applicantName }));
};



const fosterRosterInclude = {
  person: { select: { id: true, name: true, email: true, phone: true } },
  speciesCapabilities: { select: { id: true, name: true } },
  _count: { select: { placements: { where: { endDate: null } } } },
  placements: {
    where: { endDate: null },
    select: { animal: { select: { id: true, name: true } } },
  },
} satisfies Prisma.FosterProfileInclude;

export type FosterRosterListItem = Prisma.FosterProfileGetPayload<{
  include: typeof fosterRosterInclude;
}>;

const fetchFostersSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  sort: z.string().optional(),
  pageSize: pageSizeSchema,
  status: z.string().optional(),
  species: z.string().optional(),
  capacity: z.string().optional(),
});

const _fetchFosters = async (
  queryInput: string,
  currentPageInput: number,
  sortInput: string | undefined,
  pageSizeInput: number,
  statusInput?: string,
  speciesInput?: string,
  capacityInput?: string,
): Promise<{
  fosters: FosterRosterListItem[];
  totalPages: number;
  totalRows: number;
}> => {
  const validatedArgs = fetchFostersSchema.safeParse({
    query: queryInput,
    currentPage: currentPageInput,
    sort: sortInput,
    pageSize: pageSizeInput,
    status: statusInput,
    species: speciesInput,
    capacity: capacityInput,
  });

  if (!validatedArgs.success) {
    throw new Error("Invalid arguments for fetching fosters.");
  }

  const { query, currentPage, sort, pageSize, status, species, capacity } =
    validatedArgs.data;
  const offset = (currentPage - 1) * pageSize;

  const orderBy: Prisma.FosterProfileOrderByWithRelationInput = (() => {
    if (!sort) return { person: { name: "asc" } };
    const [field, direction] = sort.split(".");
    const dir = direction === "asc" ? "asc" : "desc";

    switch (field) {
      case "personName":
        return { person: { name: dir } };
      case "status":
        return { status: dir };
      default:
        return { person: { name: "asc" } };
    }
  })();

  const whereClause: Prisma.FosterProfileWhereInput = {
    person: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
  };

  if (status) {
    const statuses = status.split(",").filter(Boolean) as FosterStatus[];
    if (statuses.length > 0) {
      whereClause.status = { in: statuses };
    }
  }

  if (species) {
    const speciesIds = species.split(",").filter(Boolean);
    if (speciesIds.length > 0) {
      whereClause.speciesCapabilities = { some: { id: { in: speciesIds } } };
    }
  }

  try {
    
    
    
    
    
    
    
    if (capacity === "available") {
      const candidates = await prisma.fosterProfile.findMany({
        where: { ...whereClause, status: FosterStatus.ACTIVE },
        include: fosterRosterInclude,
        orderBy,
      });

      const available = candidates.filter(
        (profile) => profile._count.placements < profile.maxAnimals,
      );

      const totalRows = available.length;
      const totalPages = Math.ceil(totalRows / pageSize);
      const fosters = available.slice(offset, offset + pageSize);

      return { fosters, totalPages, totalRows };
    }

    const [fosters, count] = await Promise.all([
      prisma.fosterProfile.findMany({
        where: whereClause,
        include: fosterRosterInclude,
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      prisma.fosterProfile.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(count / pageSize);

    return { fosters, totalPages, totalRows: count };
  } catch (error) {
    console.error("Error fetching fosters.", error);
    throw new Error("Error fetching fosters.");
  }
};

export const fetchFosters = RequirePermission(AppPermissions.FOSTERS_READ)(
  _fetchFosters,
);



const fosterProfileForTabInclude = {
  speciesCapabilities: { select: { id: true, name: true } },
  placements: {
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    include: {
      animal: { select: { id: true, name: true } },
      
      
      outcome: { select: { type: true, reversedAt: true } },
    },
  },
} satisfies Prisma.FosterProfileInclude;

export type FosterProfileForTab = Prisma.FosterProfileGetPayload<{
  include: typeof fosterProfileForTabInclude;
}>;




const _fetchFosterProfileByPersonId = async (
  personId: string,
): Promise<FosterProfileForTab | null> => {
  const parsedId = cuidSchema.safeParse(personId);
  if (!parsedId.success) {
    return null;
  }

  try {
    return await prisma.fosterProfile.findUnique({
      where: { personId: parsedId.data },
      include: fosterProfileForTabInclude,
    });
  } catch (error) {
    console.error("Error fetching foster profile by person ID.", error);
    throw new Error("Error fetching foster profile by person ID.");
  }
};

export const fetchFosterProfileByPersonId = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchFosterProfileByPersonId);

export const fetchFostersForPicker = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchFostersForPicker);

export const fetchAnimalsEligibleForFosterPlacement = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchAnimalsEligibleForFosterPlacement);

export const fetchAnimalForFosterPlacement = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchAnimalForFosterPlacement);

export const fetchFosterProfileForPlacement = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchFosterProfileForPlacement);

export const fetchFosterPlacementById = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchFosterPlacementById);

export const fetchApprovedFosterApplications = RequirePermission(
  AppPermissions.FOSTERS_READ,
)(_fetchApprovedFosterApplications);
