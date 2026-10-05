import prisma from "@/app/lib/prisma";
import { cuidSchema } from "../zod-schemas/common.schemas";
import {
  MyAdoptionApplicationDetailPayload,
  MyAdoptionApplicationPayload,
  AnimalForAdoptionApplicationPayload,
} from "../types";
import { MyAdoptionApplicationsSchema } from "../zod-schemas/animal.schemas";
import { AnimalListingStatus } from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";
import { RequirePermission, SessionUser, withAuthenticatedUser } from "../auth/protected-actions";
import { AppPermissions } from "../auth/permissions";
import { ANIMAL_IMAGE_ORDER } from "../utils/animal-image-order";
import { BLOCKING_APPLICATION_STATUSES } from "../utils/application-status";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
  inPageOrder,
  pageApplicationsByEffectiveStatus,
  withConsequenceInHistory,
} from "./application-status.data";

const _fetchMyAdoptionApplications = async (
  user: SessionUser,
  queryInput: string,
  currentPageInput: number,
  sortInput: string | undefined,
  statusInput: string | undefined,
  pageSizeInput: number
): Promise<{
  myApplications: MyAdoptionApplicationPayload[];
  totalPages: number;
  totalRows: number;
}> => {
  const personId = user.personId;

  if (!personId) {
    return { myApplications: [], totalPages: 0, totalRows: 0 };
  }

  const validatedArgs = MyAdoptionApplicationsSchema.safeParse({
    query: queryInput,
    currentPage: currentPageInput,
    sort: sortInput,
    status: statusInput,
    pageSize: pageSizeInput,
  });

  if (!validatedArgs.success) {
    throw new Error("Invalid arguments for fetching applications.");
  }
  const { query, currentPage, sort, status, pageSize } = validatedArgs.data;
  const offset = (currentPage - 1) * pageSize;

  const [sortField, sortDirection] = sort?.split(".") ?? [];
  const dir = sortDirection === "asc" ? "asc" : "desc";
  
  
  
  const statusSort = sortField === "status" ? dir : undefined;

  const orderBy: Prisma.AdoptionApplicationOrderByWithRelationInput = (() => {
    switch (sortField) {
      case "animalName":
        return { animal: { name: dir } };
      case "submittedAt":
        return { submittedAt: dir };
      default:
        return { submittedAt: "desc" };
    }
  })();

  const whereClause: Prisma.AdoptionApplicationWhereInput = {
    applicantId: personId,
    animal: {
      name: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
  };

  try {
    const page = await pageApplicationsByEffectiveStatus({
      where: whereClause,
      orderBy,
      statuses: status ? status.split(",") : [],
      statusSort,
      offset,
      pageSize,
    });
    const rows = await prisma.adoptionApplication.findMany({
      where: { id: { in: page.ids } },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        applicantName: true,
        applicantPhone: true,
        animal: {
          select: {
            id: true,
            name: true,
            species: {
              select: {
                name: true,
              },
            },
            animalImages: {
              select: {
                url: true,
              },
              orderBy: ANIMAL_IMAGE_ORDER,
              take: 1,
            },
          },
        },
      },
    });

    return {
      myApplications: inPageOrder(rows, page),
      totalPages: Math.ceil(page.totalRows / pageSize),
      totalRows: page.totalRows,
    };
  } catch (error) {
    console.error("Error fetching applications.", error);
    throw new Error("Error fetching applications.");
  }
};

const _fetchMyAdoptionAppById = async (
  user: SessionUser,
  adoptionAppId: string 
): Promise<MyAdoptionApplicationDetailPayload | null> => {
  const personId = user.personId;

  if (!personId) {
    return null;
  }

  
  const parsedAdoptionAppId = cuidSchema.safeParse(adoptionAppId);

  if (!parsedAdoptionAppId.success) {
    return null;
  }
  const validatedAdoptionAppId = parsedAdoptionAppId.data;

  
  try {
    const myApplication = await prisma.adoptionApplication.findFirst({
      where: {
        id: validatedAdoptionAppId,
        applicantId: personId,
      },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            
            
            
            
            listingStatus: true,
            breeds: {
              select: {
                name: true,
              },
            },
            species: {
              select: {
                name: true,
              },
            },
            adoptionApplications: {
              select: {
                id: true,
              },
            },
          },
        },
        
        
        
        lastEditedBy: { select: { name: true } },
        history: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { name: true } } },
        },
      },
    });

    return myApplication && (await withConsequenceInHistory(myApplication));
  } catch (error) {
    console.error("Error fetching Application.", error);
    throw new Error("Error fetching application.");
  }
};


const _getAnimalForAdoptionApplication = async (
  user: SessionUser,
  animalId: string
): Promise<AnimalForAdoptionApplicationPayload | null> => {
  const personId = user.personId;

  if (!personId) {
    return null;
  }

  
  const parsedId = cuidSchema.safeParse(animalId);

  if (!parsedId.success) {
    return null;
  }
  const validatedAnimalId = parsedId.data;

  try {
    const animal = await prisma.animal.findFirst({
      where: {
        id: validatedAnimalId,
        listingStatus: AnimalListingStatus.PUBLISHED,
      },
      select: {
        id: true,
        name: true,
        breeds: {
          select: {
            name: true,
          },
        },
        species: {
          select: {
            name: true,
          },
        },
        
        
        
        
        
        
        adoptionApplications: {
          where: { applicantId: personId },
          select: DERIVATION_APPLICATION_SELECT,
        },
      },
    });

    if (!animal) {
      return null;
    }

    const statuses = await effectiveApplicationStatuses(
      animal.adoptionApplications,
    );
    const blockingApplications = animal.adoptionApplications
      .filter((application) =>
        BLOCKING_APPLICATION_STATUSES.includes(statuses.get(application.id)!),
      )
      .map(({ id }) => ({ id }));

    return { ...animal, adoptionApplications: blockingApplications };
  } catch (error) {
    console.error("Error fetching animal for application:", error);
    throw new Error("Failed to fetch animal information for application.");
  }
};

export type AdoptionApplicantDefaultsPayload = Prisma.PersonGetPayload<{
  select: {
    name: true;
    email: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    householdProfile: {
      select: {
        livingSituation: true;
        hasYard: true;
        landlordPermission: true;
        householdSize: true;
        hasChildren: true;
        childrenAges: true;
        otherAnimalsDescription: true;
        animalExperience: true;
      };
    };
  };
}>;

const _fetchAdoptionApplicantDefaults = async (
  user: SessionUser
): Promise<AdoptionApplicantDefaultsPayload | null> => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: user.personId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        householdProfile: {
          select: {
            livingSituation: true,
            hasYard: true,
            landlordPermission: true,
            householdSize: true,
            hasChildren: true,
            childrenAges: true,
            otherAnimalsDescription: true,
            animalExperience: true,
          },
        },
      },
    });

    return person;
  } catch (error) {
    console.error("Error fetching applicant defaults.", error);
    throw new Error("Error fetching applicant defaults.");
  }
};

export const fetchAdoptionApplicantDefaults = withAuthenticatedUser(
  RequirePermission(AppPermissions.MY_APPLICATIONS_MANAGE)(
    _fetchAdoptionApplicantDefaults
  )
);

export const fetchMyAdoptionApplications = withAuthenticatedUser(
  _fetchMyAdoptionApplications
);
export const fetchMyAdoptionAppById = withAuthenticatedUser(
  _fetchMyAdoptionAppById
);
export const getAnimalForAdoptionApplication = withAuthenticatedUser(
  _getAnimalForAdoptionApplication
);
