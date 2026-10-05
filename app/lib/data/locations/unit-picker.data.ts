import prisma from "@/app/lib/prisma";
import type { LocationType } from "@/prisma/generated/enums";
import { RequirePermission } from "../../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";


export interface UnitPickerUnit {
  id: string;
  name: string;
  capacity: number;
  occupancy: number; 
}

export interface UnitPickerLocation {
  id: string;
  name: string;
  type: LocationType;
  units: UnitPickerUnit[];
}

const _fetchUnitPickerOptions = async (): Promise<UnitPickerLocation[]> => {
  try {
    
    
    
    const locations = await prisma.location.findMany({
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
            _count: {
              select: {
                animals: {
                  where: { listingStatus: { not: "ARCHIVED" } },
                },
              },
            },
          },
        },
      },
    });

    return locations.map((location) => ({
      id: location.id,
      name: location.name,
      type: location.type,
      units: location.units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        capacity: unit.capacity,
        occupancy: unit._count.animals,
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch unit picker options:", error);
    throw new Error("Could not fetch unit picker options.");
  }
};

export const fetchUnitPickerOptions = RequirePermission(
  AppPermissions.ANIMAL_INFO_MANAGE,
)(_fetchUnitPickerOptions);
