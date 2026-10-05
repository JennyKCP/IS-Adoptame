import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { getCachedSession } from "@/app/lib/auth/session";
import { AnimalListingStatus, AnimalSize, Sex } from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import prisma from "@/app/lib/prisma";
import { cuidSchema } from "../zod-schemas/common.schemas";
import { PublishedPetsSchema } from "../zod-schemas/animal.schemas";
import { ANIMAL_IMAGE_ORDER } from "../utils/animal-image-order";
import { calculateAgeString } from "../utils/date-utils";
import { computeStays, type StayEvent } from "../utils/stay-utils";
import { calendarDay } from "../utils/shelter-day";
import { BLOCKING_APPLICATION_STATUSES } from "../utils/application-status";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
} from "./application-status.data";

export type PetsPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    birthDate: true;
    listingStatus: true;
    size: true;
    species: {
      select: {
        name: true;
      };
    };
    breeds: {
      select: {
        name: true;
      };
    };
    animalImages: {
      select: {
        url: true;
      };
      take: 1;
    };
    favorites: {
      select: {
        userId: true;
      };
      take: 1;
    };
  };
}> & {
  
  
  characteristics: { name: string }[];
};











const PUBLIC_CHARACTERISTIC_SELECT = {
  
  
  
  where: { removedAt: null },
  select: { characteristic: { select: { name: true, deletedAt: true } } },
} satisfies Prisma.Animal$animalCharacteristicsArgs;



const PET_CARD_TAG_SELECT = {
  size: true,
  species: { select: { name: true } },
  breeds: { where: { deletedAt: null }, select: { name: true } },
  animalCharacteristics: PUBLIC_CHARACTERISTIC_SELECT,
} satisfies Prisma.AnimalSelect;




function flattenCharacteristics<
  T extends {
    animalCharacteristics: {
      characteristic: { name: string; deletedAt: Date | null };
    }[];
  },
>(animal: T): Omit<T, "animalCharacteristics"> & {
  characteristics: { name: string }[];
} {
  const { animalCharacteristics, ...rest } = animal;
  return {
    ...rest,
    characteristics: animalCharacteristics
      .filter((ac) => ac.characteristic.deletedAt === null)
      .map((ac) => ({ name: ac.characteristic.name })),
  };
}

const ITEMS_PER_PAGE = 10



const SORT_MAP: Record<string, Prisma.AnimalOrderByWithRelationInput> = {
  "createdAt.desc": { createdAt: "desc" }, 
  "createdAt.asc": { createdAt: "asc" }, 
  "birthDate.desc": { birthDate: "desc" }, 
  "birthDate.asc": { birthDate: "asc" }, 
  "name.asc": { name: "asc" }, 
};

const DEFAULT_SORT: Prisma.AnimalOrderByWithRelationInput = { createdAt: "desc" };

export interface FetchPublishedPetsArgs {
  query: string;
  currentPage: number;
  speciesName?: string;
  color?: string;
  sex?: string;
  size?: string;
  sort?: string;
}

export const fetchPublishedPets = async ({
  query: queryInput,
  currentPage: currentPageInput,
  speciesName: speciesNameInput,
  color: colorInput,
  sex: sexInput,
  size: sizeInput,
  sort: sortInput,
}: FetchPublishedPetsArgs): Promise<{
  pets: PetsPayload[];
  totalPages: number;
}> => {
  
  
  
  
  const emptyToUndefined = (v?: string) => (v ? v : undefined);

  const validatedArgs = PublishedPetsSchema.safeParse({
    query: queryInput,
    currentPage: currentPageInput,
    speciesName: emptyToUndefined(speciesNameInput),
    color: emptyToUndefined(colorInput),
    sex: emptyToUndefined(sexInput),
    size: emptyToUndefined(sizeInput),
    sort: emptyToUndefined(sortInput),
  });

  if (!validatedArgs.success) {
    console.error(
      "Invalid arguments for fetching pets:",
      validatedArgs.error.flatten().fieldErrors,
    );
    throw new Error("Invalid arguments for fetching pets.");
  }
  const { query, currentPage, speciesName, color, sex, size, sort } =
    validatedArgs.data;

  
  
  const colorNames = color?.split(",").filter(Boolean) ?? [];

  const sexValues = (sex?.split(",").filter(Boolean) ?? []).filter(
    (v): v is Sex => (Object.values(Sex) as string[]).includes(v),
  );
  const sizeValues = (size?.split(",").filter(Boolean) ?? []).filter(
    (v): v is AnimalSize =>
      (Object.values(AnimalSize) as string[]).includes(v),
  );

  const orderBy = (sort && SORT_MAP[sort]) || DEFAULT_SORT;

  const session = await getCachedSession();
  const personId = session?.user?.personId;

  const whereClause: Prisma.AnimalWhereInput = {
    listingStatus: {
      in: [AnimalListingStatus.PUBLISHED, AnimalListingStatus.PENDING_ADOPTION],
    },
    
    
    
    ...(query && {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        {
          breeds: {
            some: { name: { contains: query, mode: "insensitive" } },
          },
        },
      ],
    }),
    ...(speciesName && {
      species: {
        name: speciesName,
      },
    }),
    
    
    
    ...(colorNames.length > 0 && {
      colors: {
        some: {
          name: { in: colorNames },
        },
      },
    }),
    
    ...(sexValues.length > 0 && {
      sex: { in: sexValues },
    }),
    ...(sizeValues.length > 0 && {
      size: { in: sizeValues },
    }),
  };

  try {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    
    
    
    
    
    
    
    const [totalCount, pets] = await Promise.all([
      prisma.animal.count({ where: whereClause }),
      prisma.animal.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          birthDate: true,
          ...PET_CARD_TAG_SELECT,
          animalImages: {
            select: {
              url: true,
            },
            orderBy: ANIMAL_IMAGE_ORDER,
            take: 1,
          },
          ...(personId && {
            favorites: {
              select: {
                userId: true,
              },
              where: {
                userId: personId,
              },
              take: 1,
            },
          }),
          listingStatus: true,
        },
        orderBy,
        take: ITEMS_PER_PAGE,
        skip: offset,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    return { pets: pets.map(flattenCharacteristics), totalPages };
  } catch (error) {
    console.error("Error fetching pets.", error);
    throw new Error("Error fetching pets.");
  }
};

export const fetchSpecies = async () => {
  try {
    const species = await prisma.species.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return species;
  } catch (error) {
    console.error("Error fetching species.", error);
    throw new Error("Error fetching species.");
  }
};

export const fetchColors = async () => {
  try {
    const colors = await prisma.color.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return colors;
  } catch (error) {
    console.error("Error fetching colors.", error);
    throw new Error("Error fetching colors.");
  }
};

export type FavoritePet = {
  id: string;
  name: string;
  birthDate: string;
  listingStatus: AnimalListingStatus;
  size: AnimalSize | null;
  species: { name: string };
  breeds: { name: string }[];
  characteristics: { name: string }[];
  animalImages: { url: string }[];
  
  favorites: { userId: string }[];
  isAvailable: boolean;
};

const AVAILABLE_STATUSES: AnimalListingStatus[] = [
  AnimalListingStatus.PUBLISHED,
  AnimalListingStatus.PENDING_ADOPTION,
];


export const fetchFavoritePets = async (): Promise<{
  pets: FavoritePet[];
}> => {
  const session = await getCachedSession();
  const personId = session?.user?.personId;

  if (!personId) {
    return { pets: [] };
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: personId },
      orderBy: { createdAt: "desc" }, 
      select: {
        animal: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            listingStatus: true,
            ...PET_CARD_TAG_SELECT,
            animalImages: {
              select: { url: true },
              orderBy: ANIMAL_IMAGE_ORDER,
              take: 1,
            },
          },
        },
      },
    });

    const pets: FavoritePet[] = favorites.map((favorite) => ({
      ...flattenCharacteristics(favorite.animal),
      
      favorites: [{ userId: personId }],
      isAvailable: AVAILABLE_STATUSES.includes(favorite.animal.listingStatus),
    }));

    
    const available = pets.filter((p) => p.isAvailable);
    const unavailable = pets.filter((p) => !p.isAvailable);

    return { pets: [...available, ...unavailable] };
  } catch (error) {
    console.error("Error fetching favorite pets.", error);
    throw new Error("Error fetching favorite pets.");
  }
};

export const fetchPublicPagePetById = async (id: string) => {
  
  const parsedId = cuidSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }
  
  const validatedId = parsedId.data;

  const session = await getCachedSession();
  const personId = session?.user?.personId;

  try {
    const pet = await prisma.animal.findUnique({
      where: {
        id: validatedId,
        listingStatus: {
          in: [
            AnimalListingStatus.PUBLISHED,
            AnimalListingStatus.PENDING_ADOPTION,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        listingStatus: true,
        birthDate: true,
        currentWeightGrams: true,
        heightCm: true,
        description: true,
        animalImages: {
          orderBy: ANIMAL_IMAGE_ORDER,
        },
        sex: true,
        size: true,
        isSpayedNeutered: true,
        
        
        
        
        microchipNumber: true,
        species: {
          select: {
            name: true,
          },
        },
        breeds: {
          where: { deletedAt: null },
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
          where: { deletedAt: null },
          select: {
            name: true,
          },
        },
        animalCharacteristics: PUBLIC_CHARACTERISTIC_SELECT,
        
        ...(personId && {
          favorites: {
            where: {
              userId: personId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        }),
        
        
        
        
        
        
        ...(personId && {
          adoptionApplications: {
            where: { applicantId: personId },
            select: DERIVATION_APPLICATION_SELECT,
          },
        }),
      },
    });

    if (!pet) {
      return null;
    }

    const { microchipNumber, adoptionApplications, ...rest } = pet;
    let blockingApplications: { id: string }[] = [];
    if (adoptionApplications) {
      const statuses = await effectiveApplicationStatuses(adoptionApplications);
      blockingApplications = adoptionApplications
        .filter((application) =>
          BLOCKING_APPLICATION_STATUSES.includes(statuses.get(application.id)!),
        )
        .map(({ id }) => ({ id }));
    }

    return {
      ...flattenCharacteristics(rest),
      hasMicrochip: microchipNumber !== null,
      ...(personId && { adoptionApplications: blockingApplications }),
    };
  } catch (error) {
    console.error("Error fetching pet.", error);
    throw new Error("Error fetching pet.");
  }
};

export const fetchLatestPublicAnimals = async (take: number = 4) => {
  const session = await getCachedSession();
  const personId = session?.user?.personId;

  
  try {
    const latestPets = await prisma.animal.findMany({
      where: {
        listingStatus: AnimalListingStatus.PUBLISHED,
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        ...PET_CARD_TAG_SELECT,
        animalImages: {
          select: {
            url: true,
          },
          orderBy: ANIMAL_IMAGE_ORDER,
          take: 1,
        },
        ...(personId && {
          favorites: {
            select: {
              userId: true,
            },
            where: {
              userId: personId,
            },
            take: 1,
          },
        }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });
    return latestPets.map(flattenCharacteristics);
  } catch (error) {
    console.error("Error fetching latest pets.", error);
    throw new Error("Error fetching latest pets.");
  }
};

export type SpotlightAnimal = {
  id: string;
  name: string;
  breedString: string; 
  ageString: string | null;
  description: string | null;
  weightGrams: number | null;
  isSpayedNeutered: boolean;
  
  hasMicrochip: boolean;
  
  waitingDays: number | null;
  imageUrl: string | null;
  
  isFavoritedByCurrentUser: boolean;
};


const SPOTLIGHT_COUNT = 6;


export const fetchSpotlightAnimals = async (): Promise<SpotlightAnimal[]> => {
  const session = await getCachedSession();
  const personId = session?.user?.personId;

  try {
    
    
    
    
    
    const animals = await prisma.animal.findMany({
      where: { listingStatus: AnimalListingStatus.PUBLISHED },
      select: {
        id: true,
        name: true,
        birthDate: true,
        description: true,
        currentWeightGrams: true,
        isSpayedNeutered: true,
        
        
        microchipNumber: true,
        publishedAt: true,
        breeds: { where: { deletedAt: null }, select: { name: true } },
        animalImages: {
          select: { url: true },
          orderBy: ANIMAL_IMAGE_ORDER,
          take: 1,
        },
        intake: { select: { intakeDate: true } },
        Outcome: { where: { reversedAt: null }, select: { outcomeDate: true } },
        ...(personId && {
          favorites: {
            select: { userId: true },
            where: { userId: personId },
            take: 1,
          },
        }),
      },
    });

    const today = await getShelterToday();

    const withStay = animals.map((animal) => {
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
      
      
      const { isInCare, currentStayDays } = computeStays(events, today);
      return { animal, isInCare, currentStayDays };
    });

    const longestWaiting = withStay
      .filter((row) => row.isInCare)
      .sort((a, b) => (b.currentStayDays ?? 0) - (a.currentStayDays ?? 0))
      .slice(0, SPOTLIGHT_COUNT);

    
    
    
    
    const shortfall = SPOTLIGHT_COUNT - longestWaiting.length;
    const topUp =
      shortfall > 0
        ? withStay
            .filter((row) => !row.isInCare)
            .sort((a, b) => {
              
              const aTime = a.animal.publishedAt?.getTime() ?? Infinity;
              const bTime = b.animal.publishedAt?.getTime() ?? Infinity;
              return aTime === bTime ? 0 : aTime - bTime;
            })
            .slice(0, shortfall)
        : [];

    return [...longestWaiting, ...topUp].map(({ animal, currentStayDays }) => ({
      id: animal.id,
      name: animal.name,
      
      
      
      
      
      
      
      
      breedString: (() => {
        const named = animal.breeds
          .map((breed) => breed.name)
          .filter((name) => name !== "Mixed Breed");
        if (named.length === 0) return "Mixed breed";
        const [first] = named;
        return named.length < animal.breeds.length ? `${first} mix` : first;
      })(),
      ageString: calculateAgeString({
        birthDate: calendarDay(animal.birthDate),
        simple: true,
      }),
      description: animal.description,
      weightGrams: animal.currentWeightGrams,
      isSpayedNeutered: animal.isSpayedNeutered,
      hasMicrochip: animal.microchipNumber !== null,
      waitingDays: currentStayDays,
      imageUrl: animal.animalImages[0]?.url ?? null,
      isFavoritedByCurrentUser: (animal.favorites?.length ?? 0) > 0,
    }));
  } catch (error) {
    console.error("Error fetching spotlight animals.", error);
    throw new Error("Error fetching spotlight animals.");
  }
};


export const fetchAvailableAnimalCount = async (): Promise<number> => {
  try {
    return await prisma.animal.count({
      where: { listingStatus: AnimalListingStatus.PUBLISHED },
    });
  } catch (error) {
    console.error("Error fetching available animal count.", error);
    throw new Error("Error fetching available animal count.");
  }
};
