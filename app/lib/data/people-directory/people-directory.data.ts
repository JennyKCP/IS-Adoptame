import { getPhoneSearchSettings } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import { Role } from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import {
  RequirePermission,
  SessionUser,
  withAuthenticatedUser,
} from "../../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { PeopleDirectoryParamsSchema } from "../../zod-schemas/people-directory.schemas";
import {
  HouseholdProfilePayload,
  PeopleDirectoryPayload,
  PersonForApplicationFormPayload,
  PersonFormPayload,
  PersonPickerOption,
  PersonProfileTabPayload,
  PersonSectionCardPayload,
} from "../../types";
import { cuidSchema, searchQuerySchema } from "../../zod-schemas/common.schemas";
import { normalizePhone } from "../../utils/phone";
import { nonAdminPersonFilter, personSearchWhereClause } from "./person-search";

const PICKER_RESULT_LIMIT = 10;

const _fetchPeople = async (
  queryInput: string,
  currentPageInput: number,
  sortInput: string | undefined,
  pageSizeInput: number,
  accountInput: string | undefined,
): Promise<{
  people: PeopleDirectoryPayload[];
  totalPages: number;
  totalRows: number;
}> => {
  const validatedArgs = PeopleDirectoryParamsSchema.safeParse({
    query: queryInput,
    currentPage: currentPageInput,
    sort: sortInput,
    pageSize: pageSizeInput,
    account: accountInput,
  });

  if (!validatedArgs.success) {
    throw new Error("Invalid arguments for fetching people.");
  }
  const { query, currentPage, sort, pageSize, account } = validatedArgs.data;

  const offset = (currentPage - 1) * pageSize;

  
  const orderBy: Prisma.PersonOrderByWithRelationInput = (() => {
    if (!sort) return { createdAt: "desc" };
    const [field, direction] = sort.split(".");
    const dir = direction === "asc" ? "asc" : "desc";

    switch (field) {
      case "name":
        return { name: dir };
      case "email":
        return { email: dir };
      case "phone":
        return { phone: dir };
      case "city":
        return { city: dir };
      case "state":
        return { state: dir };
      default:
        return { createdAt: "desc" };
    }
  })();

  await getPhoneSearchSettings();
  const whereClause: Prisma.PersonWhereInput = personSearchWhereClause(query);

  
  
  
  if (account) {
    const selected = account.split(",").filter(Boolean);
    const wantsRegistered = selected.includes("registered");
    const wantsNoAccount = selected.includes("no_account");

    
    if (wantsRegistered && !wantsNoAccount) {
      whereClause.AND = [
        ...(whereClause.AND as Prisma.PersonWhereInput[]),
        { user: { isNot: null } },
      ];
    } else if (wantsNoAccount && !wantsRegistered) {
      whereClause.AND = [
        ...(whereClause.AND as Prisma.PersonWhereInput[]),
        { user: { is: null } },
      ];
    }
  }

  try {
    const [totalRows, people] = await Promise.all([
      prisma.person.count({ where: whereClause }),
      prisma.person.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRows / pageSize);

    return { people, totalPages, totalRows };
  } catch (error) {
    console.error("Error fetching people.", error);
    throw new Error("Error fetching people.");
  }
};




const _fetchPeopleForPicker = async (
  queryInput: string,
): Promise<PersonPickerOption[]> => {
  const parsedQuery = searchQuerySchema.safeParse(queryInput);
  const query = parsedQuery.success ? parsedQuery.data : "";

  try {
    await getPhoneSearchSettings();
    return await prisma.person.findMany({
      where: personSearchWhereClause(query),
      orderBy: { name: "asc" },
      take: PICKER_RESULT_LIMIT,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  } catch (error) {
    console.error("Error fetching people for picker.", error);
    throw new Error("Error fetching people for picker.");
  }
};








const _fetchDuplicatePersonCandidate = async (
  email: string | null,
  phone: string | null,
  excludePersonId?: string,
): Promise<PersonPickerOption | null> => {
  const normalizedPhone = normalizePhone(phone, (await getPhoneSearchSettings()).defaultPhoneCountry);

  if (!email && !normalizedPhone) {
    return null;
  }

  try {
    return await prisma.person.findFirst({
      where: {
        AND: [
          nonAdminPersonFilter,
          {
            OR: [
              ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
              ...(normalizedPhone ? [{ phoneNormalized: normalizedPhone }] : []),
            ],
          },
          ...(excludePersonId ? [{ NOT: { id: excludePersonId } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  } catch (error) {
    console.error("Error checking for a duplicate person.", error);
    throw new Error("Error checking for a duplicate person.");
  }
};

const _fetchSectionCardsPersonData = async (
  id: string,
): Promise<PersonSectionCardPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  const validatedPersonId = parsedId.data;

  try {
    const person = await prisma.person.findUnique({
      where: { id: validatedPersonId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        user: {
          select: {
            id: true,
            role: true,
            image: true,
            emailVerified: true,
            
            
            
            
            deactivatedAt: true,
          },
        },
        _count: {
          select: {
            adoptionApplications: true,
            surrenderedAnimals: true,
            foundAnimals: true,
            
            
            reclaimedAnimalsAsOwner: { where: { reversedAt: null } },
            tasksAssigned: true,
            tasksCreated: true,
            animalNotesAuthored: true,
            processedIntakes: true,
            processedOutcomes: { where: { reversedAt: null } },
          },
        },
      },
    });

    if (person?.user?.role === Role.ADMIN) {
      return null;
    }

    return person;
  } catch (error) {
    console.error("Error fetching person by ID.", error);
    throw new Error("Error fetching person details.");
  }
};

const _fetchPersonForEdit = async (
  id: string,
): Promise<PersonFormPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  try {
    const person = await prisma.person.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        user: { select: { role: true } },
      },
    });

    if (person?.user?.role === Role.ADMIN) {
      return null;
    }

    
    if (!person) return null;
    const { user: _user, ...rest } = person;
    return rest;
  } catch (error) {
    console.error("Error fetching person for edit.", error);
    throw new Error("Error fetching person data.");
  }
};

const _fetchMyProfile = async (
  user: SessionUser,
): Promise<PersonFormPayload | null> => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: user.personId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });

    return person;
  } catch (error) {
    console.error("Error fetching own profile.", error);
    throw new Error("Error fetching profile data.");
  }
};

const _fetchPersonProfileTabData = async (
  id: string,
): Promise<PersonProfileTabPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  try {
    const person = await prisma.person.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        user: {
          select: {
            role: true,
            
            
            email: true,
            emailVerified: true,
          },
        },
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
            
            
            lastEditedAt: true,
            lastEditedBy: { select: { name: true } },
          },
        },
      },
    });

    if (person?.user?.role === Role.ADMIN) {
      return null;
    }

    return person;
  } catch (error) {
    console.error("Error fetching person profile tab data.", error);
    throw new Error("Error fetching person profile data.");
  }
};

const _fetchMyHouseholdProfile = async (
  user: SessionUser,
): Promise<HouseholdProfilePayload | null> => {
  try {
    const profile = await prisma.householdProfile.findUnique({
      where: { personId: user.personId },
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
    });

    return profile;
  } catch (error) {
    console.error("Error fetching household profile.", error);
    throw new Error("Error fetching household profile data.");
  }
};

const _fetchPersonForApplicationForm = async (
  id: string,
): Promise<PersonForApplicationFormPayload | null> => {
  const parsedId = cuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  try {
    
    
    
    
    
    const person = await prisma.person.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
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
    console.error("Error fetching person for application form.", error);
    throw new Error("Error fetching person data.");
  }
};

export const fetchPersonForApplicationForm = RequirePermission(
  AppPermissions.PERSONS_MANAGE,
)(_fetchPersonForApplicationForm);

export const fetchPersonProfileTabData = RequirePermission(
  AppPermissions.PERSONS_READ,
)(_fetchPersonProfileTabData);

export const fetchMyHouseholdProfile = withAuthenticatedUser(
  RequirePermission(AppPermissions.MY_PROFILE_UPDATE)(_fetchMyHouseholdProfile),
);

export const fetchMyProfile = withAuthenticatedUser(
  RequirePermission(AppPermissions.MY_PROFILE_UPDATE)(_fetchMyProfile),
);

export const fetchPersonForEdit = RequirePermission(
  AppPermissions.PERSONS_MANAGE,
)(_fetchPersonForEdit);

export const fetchSectionCardsPersonData = RequirePermission(
  AppPermissions.PERSONS_READ,
)(_fetchSectionCardsPersonData);

export const fetchPeople = RequirePermission(AppPermissions.PERSONS_READ)(
  _fetchPeople,
);

export const fetchPeopleForPicker = RequirePermission(
  AppPermissions.PERSONS_READ,
)(_fetchPeopleForPicker);

export const fetchDuplicatePersonCandidate = RequirePermission(
  AppPermissions.PERSONS_READ,
)(_fetchDuplicatePersonCandidate);
