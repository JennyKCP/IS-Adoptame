import prisma from "@/app/lib/prisma";
import type { LocationType, Sex } from "@/prisma/generated/enums";
import { ANIMAL_IMAGE_ORDER } from "../../utils/animal-image-order";




export interface BoardAnimal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: Sex;
  birthDate: string;
  thumbnailUrl: string | null; 
}

export interface BoardUnit {
  id: string;
  name: string;
  capacity: number;
  animals: BoardAnimal[]; 
}

export interface BoardLocation {
  id: string;
  name: string;
  type: LocationType;
  units: BoardUnit[];
}



export interface FosteredBoardAnimal extends BoardAnimal {
  fosterPersonId: string;
  fosterPersonName: string;
  since: string;
}

export interface ShelterBoardData {
  locations: BoardLocation[];
  unplaced: BoardAnimal[]; 
  fostered: FosteredBoardAnimal[]; 
  totals: {
    onSite: number; 
    unplaced: number;
    inFoster: number;
    units: number;
  };
}


const animalChipSelect = {
  id: true,
  name: true,
  sex: true,
  birthDate: true,
  species: { select: { name: true } },
  breeds: { select: { name: true }, take: 1, orderBy: { name: "asc" } },
  animalImages: {
    select: { url: true },
    take: 1,
    orderBy: ANIMAL_IMAGE_ORDER,
  },
} as const;

const toBoardAnimal = (animal: {
  id: string;
  name: string;
  sex: Sex;
  birthDate: string;
  species: { name: string };
  breeds: { name: string }[];
  animalImages: { url: string }[];
}): BoardAnimal => ({
  id: animal.id,
  name: animal.name,
  sex: animal.sex,
  birthDate: animal.birthDate,
  species: animal.species.name,
  breed: animal.breeds[0]?.name ?? null,
  thumbnailUrl: animal.animalImages[0]?.url ?? null,
});


export const queryShelterBoard = async (): Promise<ShelterBoardData> => {
  try {
    
    
    
    const [locationRows, unplacedRows, fosteredRows] = await Promise.all([
      
      prisma.location.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          units: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              capacity: true,
              animals: {
                where: { listingStatus: { not: "ARCHIVED" } },
                orderBy: { name: "asc" },
                select: animalChipSelect,
              },
            },
          },
        },
      }),
      
      prisma.animal.findMany({
        where: {
          currentUnitId: null,
          fosterPlacements: { none: { endDate: null } },
          listingStatus: { not: "ARCHIVED" },
        },
        orderBy: { name: "asc" },
        select: animalChipSelect,
      }),
      
      prisma.animal.findMany({
        where: {
          currentUnitId: null,
          fosterPlacements: { some: { endDate: null } },
          listingStatus: { not: "ARCHIVED" },
        },
        orderBy: { name: "asc" },
        select: {
          ...animalChipSelect,
          fosterPlacements: {
            where: { endDate: null },
            select: {
              startDate: true,
              fosterProfile: {
                select: { person: { select: { id: true, name: true } } },
              },
            },
            orderBy: [
              { startDate: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            take: 1,
          },
        },
      }),
    ]);

    const locations: BoardLocation[] = locationRows.map((location) => ({
      id: location.id,
      name: location.name,
      type: location.type,
      units: location.units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        capacity: unit.capacity,
        animals: unit.animals.map(toBoardAnimal),
      })),
    }));

    const unplaced = unplacedRows.map(toBoardAnimal);

    
    
    const fostered: FosteredBoardAnimal[] = fosteredRows.map((animal) => {
      const placement = animal.fosterPlacements[0];
      return {
        ...toBoardAnimal(animal),
        fosterPersonId: placement.fosterProfile.person.id,
        fosterPersonName: placement.fosterProfile.person.name,
        since: placement.startDate,
      };
    });

    const onSite = locations.reduce(
      (sum, location) =>
        sum +
        location.units.reduce(
          (unitSum, unit) => unitSum + unit.animals.length,
          0,
        ),
      0,
    );
    const unitCount = locations.reduce(
      (sum, location) => sum + location.units.length,
      0,
    );

    return {
      locations,
      unplaced,
      fostered,
      totals: {
        onSite,
        unplaced: unplaced.length,
        inFoster: fostered.length,
        units: unitCount,
      },
    };
  } catch (error) {
    console.error("Failed to fetch shelter board:", error);
    throw new Error("Could not fetch the shelter board.");
  }
};
