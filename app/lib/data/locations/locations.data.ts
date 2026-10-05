import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { RequirePermission } from "../../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";

export type LocationWithUnits = Prisma.LocationGetPayload<{
  include: { units: true };
}>;

const _fetchLocationsWithUnits = async (
  statusInput?: string,
): Promise<LocationWithUnits[]> => {
  
  
  const selected = statusInput ? statusInput.split(",").filter(Boolean) : [];
  const wantsActive = selected.includes("active");
  const wantsDeleted = selected.includes("deleted");

  let deletedFilter: Prisma.LocationWhereInput = {};
  if (wantsDeleted && !wantsActive) {
    deletedFilter = { deletedAt: { not: null } }; 
  } else if (wantsActive && wantsDeleted) {
    deletedFilter = {}; 
  } else {
    deletedFilter = { deletedAt: null }; 
  }

  try {
    
    
    return await prisma.location.findMany({
      where: deletedFilter,
      include: {
        units: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    throw new Error("Could not fetch locations.");
  }
};

export const fetchLocationsWithUnits = RequirePermission(
  AppPermissions.MANAGE_LOCATIONS,
)(_fetchLocationsWithUnits);
