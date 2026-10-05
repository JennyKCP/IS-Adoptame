import prisma from "@/app/lib/prisma";
import {
  AnimalListingStatus,
  IntakeType,
  TaskStatus,
  type Sex,
} from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import {
  AnimalsPayload,
  SpeciesPayload,
  ColorPayload,
  PartnerPayload,
  AnimalIntakeFormPayload,
  AnimalSectionCardPayload,
  AnimalReIntakeFormPayload,
} from "../../types";
import { cuidSchema } from "../../zod-schemas/common.schemas";
import { searchQuerySchema } from "../../zod-schemas/common.schemas";
import { DashboardAnimalsSchema } from "../../zod-schemas/animal.schemas";
import { RequirePermission } from "../../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { LATEST_ENTRY_ORDER } from "../../utils/vitals-order";
import { ANIMAL_IMAGE_ORDER } from "../../utils/animal-image-order";
import { ACTIVE_APPLICATION_STATUSES } from "../../utils/application-status";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
} from "../application-status.data";


const _fetchAnimals = async (
  queryInput: string,
  currentPageInput: number,
  listingStatusInput: string | undefined,
  sexInput: string | undefined,
  pageSizeInput: number,
  sortInput: string | undefined,
): Promise<{
  animals: AnimalsPayload[];
  totalPages: number;
  totalRows: number;
}> => {
  
  const validatedArgs = DashboardAnimalsSchema.safeParse({
    query: queryInput,
    currentPage: currentPageInput,
    listingStatus: listingStatusInput,
    sex: sexInput,
    pageSize: pageSizeInput,
    sort: sortInput,
  });

  if (!validatedArgs.success) {
    throw new Error("Invalid arguments for fetching animals.");
  }
  const { query, currentPage, listingStatus, sex, pageSize, sort } =
    validatedArgs.data;

  const orderBy: Prisma.AnimalOrderByWithRelationInput = (() => {
    if (!sort) return { createdAt: "desc" };

    const [id, dir] = sort.split(".");
    const direction: "asc" | "desc" = dir === "desc" ? "desc" : "asc";

    const sortableFields = new Set([
      "name",
      "birthDate",
      "listingStatus",
      "sex",
      "size",
      "createdAt",
    ]);
    if (sortableFields.has(id)) {
      return { [id]: direction };
    }

    return { createdAt: "desc" };
  })();

  
  
  const whereClause: Prisma.AnimalWhereInput = {
    name: { contains: query, mode: "insensitive" },
    ...(listingStatus && {
      listingStatus: { in: listingStatus.split(",") as AnimalListingStatus[] },
    }),
    ...(sex && { sex: { in: sex.split(",") as Sex[] } }),
  };

  try {
    const offset = (currentPage - 1) * pageSize;

    const [totalCount, animals] = await Promise.all([
      prisma.animal.count({ where: whereClause }),
      prisma.animal.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          birthDate: true,
          listingStatus: true,
          sex: true,
          size: true,
        },
        orderBy: orderBy,
        take: pageSize,
        skip: offset,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return { animals, totalPages, totalRows: totalCount };
  } catch (error) {
    console.error("Error fetching animals.", error);
    throw new Error("Error fetching animals.");
  }
};









const _fetchSectionCardsAnimalData = async (
  id: string,
): Promise<AnimalSectionCardPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        sex: true,
        size: true,
        microchipNumber: true,
        listingStatus: true,
        isSpayedNeutered: true,
        healthStatus: true,
        animalImages: {
          select: {
            url: true,
          },
          orderBy: ANIMAL_IMAGE_ORDER,
          take: 1,
        },
        species: {
          select: {
            name: true,
          },
        },
        breeds: {
          where: {
            deletedAt: null,
          },
          select: {
            name: true,
          },
        },
        primaryColor: {
          select: {
            name: true,
          },
        },
        colors: {
          where: {
            deletedAt: null,
          },
          select: {
            name: true,
          },
        },
        currentUnit: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        fosterPlacements: {
          where: { endDate: null },
          select: {
            id: true,
            type: true,
            startDate: true,
            expectedEndDate: true,
            fosterProfile: {
              select: { person: { select: { id: true, name: true } } },
            },
          },
          take: 1,
        },
        
        
        
        
        
        
        adoptionApplications: {
          select: DERIVATION_APPLICATION_SELECT,
        },
        intake: {
          select: {
            intakeDate: true,
          },
          
          
          orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        vitalsLogs: {
          where: { deletedAt: null, weightGrams: { not: null } },
          select: { recordedAt: true, weightGrams: true },
          orderBy: LATEST_ENTRY_ORDER,
          take: 2,
        },
        _count: {
          select: {
            favorites: true,
            tasks: {
              where: {
                status: {
                  in: ["TODO", "IN_PROGRESS"],
                },
              },
            },
          },
        },
      },
    });

    if (!animal) {
      return null;
    }

    const statuses = await effectiveApplicationStatuses(
      animal.adoptionApplications,
    );
    return {
      ...animal,
      adoptionApplications: animal.adoptionApplications.map((application) => ({
        id: application.id,
        status: statuses.get(application.id)!,
      })),
    };
  } catch (error) {
    console.error("Error fetching animal by ID.", error);
    throw new Error("Error fetching animal details.");
  }
};


const _fetchAnimalById = async (
  id: string,
): Promise<AnimalIntakeFormPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        sex: true,
        size: true,
        currentWeightGrams: true,
        heightCm: true,
        description: true,
        listingStatus: true,
        microchipNumber: true,
        isSpayedNeutered: true,
        healthStatus: true,
        speciesId: true,
        primaryColorId: true,
        currentUnitId: true,
        breeds: {
          select: {
            id: true,
          },
        },
        colors: {
          select: {
            id: true,
          },
        },
        
        
        
        vitalsLogs: {
          where: { deletedAt: null, weightGrams: { not: null } },
          select: { recordedAt: true },
          orderBy: LATEST_ENTRY_ORDER,
          take: 1,
        },
      },
    });
    return animal;
  } catch (error) {
    console.error("Error fetching animal data.", error);
    throw new Error("Error fetching animal data.");
  }
};

const _fetchPartners = async (): Promise<PartnerPayload[]> => {
  try {
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return partners;
  } catch (error) {
    console.error("Error fetching partners.", error);
    throw new Error("Error fetching partners.");
  }
};

export const fetchColors = async (): Promise<ColorPayload[]> => {
  try {
    const colors = await prisma.color.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return colors;
  } catch (error) {
    console.error("Error fetching colors.", error);
    throw new Error("Error fetching colors.");
  }
};

export const fetchSpecies = async (): Promise<SpeciesPayload[]> => {
  try {
    const species = await prisma.species.findMany({
      select: {
        id: true,
        name: true,
        breeds: {
          select: {
            id: true,
            name: true,
            typicalSize: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return species;
  } catch (error) {
    console.error("Error fetching species.", error);
    throw new Error("Error fetching species.");
  }
};

const _fetchAnimalForPhotoPage = async (id: string) => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }
  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: {
        id: true,
        name: true,
        animalImages: {
          orderBy: ANIMAL_IMAGE_ORDER,
        },
      },
    });
    return animal;
  } catch (error) {
    console.error("Error fetching animal for photos page.", error);
    throw new Error("Error fetching animal photo data.");
  }
};

const _fetchAnimalForOutcomeForm = async (id: string) => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }
  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: {
        id: true,
        name: true,
        listingStatus: true,
        intake: {
          where: {
            type: IntakeType.OWNER_SURRENDER,
            surrenderingPersonId: { not: null },
          },
          orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            surrenderingPerson: {
              select: { id: true, name: true },
            },
          },
        },
        
        
        fosterPlacements: {
          where: { endDate: null },
          take: 1,
          select: {
            id: true,
            type: true,
            startDate: true,
            fosterProfile: {
              select: { person: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    return animal;
  } catch (error) {
    console.error("Error fetching animal for outcome form.", error);
    throw new Error("Error fetching animal data for outcome.");
  }
};

const _fetchAnimalForReIntake = async (
  id: string,
): Promise<AnimalReIntakeFormPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }
  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: {
        id: true,
        name: true,
        listingStatus: true,
      },
    });
    return animal;
  } catch (error) {
    console.error("Error fetching animal for re-intake form.", error);
    throw new Error("Error fetching animal data for re-intake.");
  }
};

export type AnimalSearchResult = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    species: { select: { name: true } };
    listingStatus: true;
  };
}>;

const _searchPublishedAnimals = async (
  query: string,
  excludePersonId?: string,
) => {
  const parsed = searchQuerySchema.safeParse(query);
  const q = parsed.success ? parsed.data : "";

  try {
    
    
    
    
    
    
    
    
    let blockedAnimalIds: string[] = [];
    if (excludePersonId) {
      const applications = await prisma.adoptionApplication.findMany({
        where: { applicantId: excludePersonId },
        select: DERIVATION_APPLICATION_SELECT,
      });
      const statuses = await effectiveApplicationStatuses(applications);
      blockedAnimalIds = applications
        .filter((application) =>
          ACTIVE_APPLICATION_STATUSES.includes(statuses.get(application.id)!),
        )
        .map((application) => application.animalId);
    }

    return await prisma.animal.findMany({
      where: {
        listingStatus: AnimalListingStatus.PUBLISHED,
        name: { contains: q, mode: "insensitive" },
        ...(blockedAnimalIds.length > 0 && {
          id: { notIn: blockedAnimalIds },
        }),
      },
      select: {
        id: true,
        name: true,
        species: { select: { name: true } },
        listingStatus: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error searching published animals.", error);
    throw new Error("Error searching animals.");
  }
};
















export const AI_ANIMAL_SEARCH_LIMIT = 25;

const aiAnimalMatchSelect = {
  id: true,
  name: true,
  birthDate: true,
  species: { select: { name: true } },
  currentUnit: {
    select: { name: true, location: { select: { name: true } } },
  },
} satisfies Prisma.AnimalSelect;

export type AiAnimalMatchRow = Prisma.AnimalGetPayload<{
  select: typeof aiAnimalMatchSelect;
}>;


export const _findAnimalsByName = async (
  query: string,
): Promise<AiAnimalMatchRow[]> => {
  const parsed = searchQuerySchema.safeParse(query);
  const q = parsed.success ? parsed.data : "";

  try {
    return await prisma.animal.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        listingStatus: { not: AnimalListingStatus.ARCHIVED },
      },
      select: aiAnimalMatchSelect,
      orderBy: [{ name: "asc" }, { birthDate: "asc" }],
      take: AI_ANIMAL_SEARCH_LIMIT,
    });
  } catch (error) {
    console.error("Error searching animals for the AI assistant.", error);
    throw new Error("Error searching animals.");
  }
};

const aiAnimalSummarySelect = {
  id: true,
  name: true,
  sex: true,
  birthDate: true,
  size: true,
  healthStatus: true,
  listingStatus: true,
  species: { select: { name: true } },
  breeds: { where: { deletedAt: null }, select: { name: true } },
  primaryColor: { select: { name: true } },
  currentUnit: {
    select: { name: true, location: { select: { name: true } } },
  },
  
  
  fosterPlacements: {
    where: { endDate: null },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      type: true,
      startDate: true,
      expectedEndDate: true,
      fosterProfile: {
        select: { person: { select: { id: true, name: true } } },
      },
    },
  },
  
  tasks: {
    where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      category: true,
      dueDate: true,
    },
  },
  intake: {
    orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { intakeDate: true, type: true },
  },
} satisfies Prisma.AnimalSelect;

export type AiAnimalSummaryRow = Prisma.AnimalGetPayload<{
  select: typeof aiAnimalSummarySelect;
}>;


export const _fetchAnimalSummary = async (
  animalId: string,
): Promise<AiAnimalSummaryRow | null> => {
  const parsedId = cuidSchema.safeParse(animalId);
  if (!parsedId.success) return null;

  try {
    return await prisma.animal.findUnique({
      where: { id: parsedId.data },
      select: aiAnimalSummarySelect,
    });
  } catch (error) {
    console.error("Error fetching animal summary for the AI assistant.", error);
    throw new Error("Error fetching animal summary.");
  }
};

export const searchPublishedAnimals = RequirePermission(
  AppPermissions.PERSONS_MANAGE,
)(_searchPublishedAnimals);

export const fetchAnimalForReIntake = RequirePermission(
  AppPermissions.ANIMAL_INFO_READ,
)(_fetchAnimalForReIntake);

export const fetchAnimalForOutcomeForm = RequirePermission(
  AppPermissions.ANIMAL_INFO_READ,
)(_fetchAnimalForOutcomeForm);

export const fetchAnimalForPhotosPage = RequirePermission(
  AppPermissions.ANIMAL_INFO_READ,
)(_fetchAnimalForPhotoPage);

export const fetchPartners = RequirePermission(AppPermissions.PARTNERS_READ)(
  _fetchPartners,
);

export const fetchAnimals = RequirePermission(AppPermissions.ANIMAL_INFO_READ)(
  _fetchAnimals,
);

export const fetchAnimalById = RequirePermission(
  AppPermissions.ANIMAL_INFO_READ,
)(_fetchAnimalById);

export const fetchSectionCardsAnimalData = RequirePermission(
  AppPermissions.ANIMAL_INFO_READ,
)(_fetchSectionCardsAnimalData);
