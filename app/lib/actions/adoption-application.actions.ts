"use server";

import { revalidatePath } from "next/cache";
import prisma, { type TransactionClient } from "@/app/lib/prisma";
import {
  StaffUpdateAdoptionAppFormSchema,
  StaffAdoptionApplicationFormSchema,
  type StaffAdoptionApplicationFormInput,
  type StaffUpdateAdoptionAppFormInput,
} from "../zod-schemas/application.schemas";
import {
  MyAdoptionAppFormSchema,
  toAdoptionApplicantData,
  type MyAdoptionAppFormInput,
} from "../zod-schemas/myAdoptionApplication.schema";
import {
  householdEditStamp,
  toHouseholdData,
} from "../zod-schemas/household-profile.schemas";
import { cuidSchema } from "../zod-schemas/common.schemas";
import { RequirePermission } from "../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import {
  ApplicationSource,
  ApplicationStatus,
  AnimalListingStatus,
} from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import { getCachedSession } from "@/app/lib/auth/session";
import { ConflictError } from "../utils/errors";
import { safeInternalPath } from "../utils/safe-redirect";
import {
  ACTIVE_APPLICATION_STATUSES,
  isAllowedTransition,
  illegalTransitionMessage,
  STAFF_EDITABLE_STATUSES,
  statusChangeNeedsReason,
} from "../utils/application-status";
import { formatSingleEnumOption } from "../utils/enum-formatter";
import type { EffectiveApplicationStatus } from "../utils/derive-application-status";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatus,
  effectiveApplicationStatuses,
  effectiveStatusBehindLock,
  lockAnimal,
  lockPerson,
} from "../data/application-status.data";
import { z } from "zod";
import type { FieldErrors, FormResult } from "@/app/lib/action-result";

const ADOPTION_APPLICATIONS_PATH = "/dashboard/adoption-applications";

const personApplicationsPath = (personId: string) =>
  `/dashboard/people-directory/${personId}/adoption-applications`;

const DUPLICATE_APPLICATION_MESSAGE =
  "An active application already exists for this person and animal.";






const hasActiveApplication = async (
  db: Pick<TransactionClient, "adoptionApplication" | "outcome">,
  personId: string,
  animalId: string,
) => {
  const applications = await db.adoptionApplication.findMany({
    where: { applicantId: personId, animalId },
    select: DERIVATION_APPLICATION_SELECT,
  });
  const statuses = await effectiveApplicationStatuses(applications, db);
  return [...statuses.values()].some((status) =>
    ACTIVE_APPLICATION_STATUSES.includes(status),
  );
};

const _staffUpdateAdoptionApp = async (
  adoptionAppId: string,
  returnTo: string | null,
  values: StaffUpdateAdoptionAppFormInput
): Promise<FormResult<StaffUpdateAdoptionAppFormInput>> => {
  const session = await getCachedSession();
  if (!session?.user?.personId) {
    return {
      ok: false,
      message:
        "Unauthorized: You must be logged in with a valid user profile to perform this action.",
    };
  }
  const currentPersonId = session.user.personId;

  const parsedAdoptionAppId = cuidSchema.safeParse(adoptionAppId);
  if (!parsedAdoptionAppId.success) {
    return { ok: false, message: "Invalid Adoption Application ID format." };
  }
  const validatedAdoptionAppId = parsedAdoptionAppId.data;

  let existingApplication;
  
  
  
  let currentStatus: EffectiveApplicationStatus;
  try {
    existingApplication = await prisma.adoptionApplication.findUnique({
      where: { id: validatedAdoptionAppId },
      select: DERIVATION_APPLICATION_SELECT,
    });
    if (!existingApplication) {
      return { ok: false, message: "Adoption Application not found." };
    }
    currentStatus = await effectiveApplicationStatus(existingApplication);
  } catch (error) {
    console.error("Database error fetching existing application:", error);
    return {
      ok: false,
      message: "Database Error: Failed to retrieve application details.",
    };
  }

  const validatedFields = StaffUpdateAdoptionAppFormSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error(
      "Validation error in staff update adoption application:",
      validatedFields.error
    );
    return {
      ok: false,
      message:
        "Missing or Invalid Fields. Failed to Update Adoption Application.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<StaffUpdateAdoptionAppFormInput>,
    };
  }

  const {
    status: newStatus,
    internalNotes,
    statusChangeReason,
  } = validatedFields.data;

  const isStatusActuallyChanging =
    newStatus !== undefined && newStatus !== currentStatus;

  if (
    isStatusActuallyChanging &&
    !isAllowedTransition(currentStatus, newStatus)
  ) {
    return {
      ok: false,
      message: illegalTransitionMessage(currentStatus, newStatus),
    };
  }

  if (
    statusChangeNeedsReason(currentStatus, newStatus) &&
    (!statusChangeReason || statusChangeReason.trim() === "")
  ) {
    return {
      ok: false,
      message:
        "Validation Error: A reason for the status change is required.",
      fieldErrors: {
        statusChangeReason: ["A reason for the status change is required."],
      },
    };
  }

  const applicationUpdateData: Prisma.AdoptionApplicationUpdateInput = {};
  if (isStatusActuallyChanging) {
    applicationUpdateData.status = newStatus;
  }
  if (internalNotes !== undefined) {
    applicationUpdateData.internalNotes =
      internalNotes.trim() === "" ? null : internalNotes;
  }

  if (Object.keys(applicationUpdateData).length === 0) {
    return {
      ok: false,
      message: "No changes provided to update the application.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      
      
      
      
      const statusNow = await effectiveStatusBehindLock(tx, existingApplication);
      if (statusNow === null) {
        throw new ConflictError("Adoption Application not found.");
      }
      if (statusNow !== currentStatus) {
        throw new ConflictError(
          `This application is now ${formatSingleEnumOption(statusNow).toLowerCase()}. Reload it and review again.`,
        );
      }

      
      if (existingApplication.animalId && isStatusActuallyChanging) {
        if (newStatus === ApplicationStatus.APPROVED) {
          
          
          const updateResult = await tx.animal.updateMany({
            where: {
              id: existingApplication.animalId,
              listingStatus: AnimalListingStatus.PUBLISHED,
            },
            data: {
              listingStatus: AnimalListingStatus.PENDING_ADOPTION,
            },
          });

          
          
          if (updateResult.count === 0) {
            throw new ConflictError(
              "This animal is no longer available for adoption. Another application may have just been approved."
            );
          }
        }
        
        else if (
          currentStatus === ApplicationStatus.APPROVED &&
          (newStatus === ApplicationStatus.WITHDRAWN ||
            newStatus === ApplicationStatus.REJECTED)
        ) {
          await tx.animal.updateMany({
            where: {
              id: existingApplication.animalId,
              listingStatus: AnimalListingStatus.PENDING_ADOPTION,
            },
            data: { listingStatus: AnimalListingStatus.PUBLISHED },
          });
        }
      }

      if (Object.keys(applicationUpdateData).length > 0) {
        await tx.adoptionApplication.update({
          where: { id: validatedAdoptionAppId },
          data: applicationUpdateData,
        });
      }

      if (isStatusActuallyChanging && newStatus) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: validatedAdoptionAppId,
            status: newStatus,
            statusChangeReason:
              statusChangeReason || "Application moved to review.",
            changedById: currentPersonId,
          },
        });
      }
    });
  } catch (error) {
    console.error("Database Error during transaction:", error);
    if (error instanceof ConflictError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message:
        "Database Error: Failed to Update Adoption Application and associated records.",
    };
  }

  revalidatePath(ADOPTION_APPLICATIONS_PATH);
  revalidatePath(`${ADOPTION_APPLICATIONS_PATH}/${validatedAdoptionAppId}/review`);

  return {
    ok: true,
    message: "Application updated successfully.",
    redirectTo: safeInternalPath(returnTo, ADOPTION_APPLICATIONS_PATH),
  };
};

export const staffUpdateAdoptionApp = RequirePermission(
  AppPermissions.APPLICATIONS_MANAGE_STATUS
)(_staffUpdateAdoptionApp);

const _staffCreateAdoptionApplication = async (
  personId: string,
  returnTo: string | null,
  values: StaffAdoptionApplicationFormInput
): Promise<FormResult<StaffAdoptionApplicationFormInput>> => {
  const session = await getCachedSession();
  if (!session?.user?.personId) {
    return {
      ok: false,
      message:
        "Unauthorized: You must be logged in with a valid user profile to perform this action.",
    };
  }
  const currentPersonId = session.user.personId;

  const parsedPersonId = cuidSchema.safeParse(personId);
  if (!parsedPersonId.success) {
    return { ok: false, message: "Invalid Person ID format." };
  }
  const validatedPersonId = parsedPersonId.data;

  
  
  
  
  
  let targetPerson;
  try {
    targetPerson = await prisma.person.findUnique({
      where: { id: validatedPersonId },
      select: { id: true },
    });
  } catch (error) {
    console.error("Database error fetching person:", error);
    return {
      ok: false,
      message: "Database Error: Failed to verify the person record.",
    };
  }
  if (!targetPerson) {
    return { ok: false, message: "Person not found." };
  }

  const validatedFields =
    StaffAdoptionApplicationFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or Invalid Fields. Failed to Create Adoption Application.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<StaffAdoptionApplicationFormInput>,
    };
  }

  const { animalId } = validatedFields.data;

  
  let animal;
  try {
    animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { listingStatus: true },
    });
  } catch (error) {
    console.error("Database error fetching animal:", error);
    return {
      ok: false,
      message: "Database Error: Failed to verify animal availability.",
    };
  }

  if (!animal || animal.listingStatus !== AnimalListingStatus.PUBLISHED) {
    return {
      ok: false,
      message: "This animal is not available for adoption applications.",
    };
  }

  
  
  
  
  
  let hasDuplicate;
  try {
    hasDuplicate = await hasActiveApplication(
      prisma,
      validatedPersonId,
      animalId,
    );
  } catch (error) {
    console.error("Database error checking for duplicate application:", error);
    return {
      ok: false,
      message: "Database Error: Failed to check for existing applications.",
    };
  }

  if (hasDuplicate) {
    return { ok: false, message: DUPLICATE_APPLICATION_MESSAGE };
  }

  
  
  
  const householdProfileData = toHouseholdData(validatedFields.data);

  try {
    await prisma.$transaction(async (tx) => {
      
      
      await lockPerson(tx, validatedPersonId);

      
      
      
      await lockAnimal(tx, animalId);

      
      
      
      
      const lockedAnimal = await tx.animal.findUnique({
        where: { id: animalId },
        select: { listingStatus: true },
      });
      if (lockedAnimal?.listingStatus !== AnimalListingStatus.PUBLISHED) {
        throw new ConflictError(
          "This animal is not available for adoption applications.",
        );
      }
      if (await hasActiveApplication(tx, validatedPersonId, animalId)) {
        throw new ConflictError(DUPLICATE_APPLICATION_MESSAGE);
      }

      const newApplication = await tx.adoptionApplication.create({
        data: {
          applicantId: validatedPersonId,
          animalId,
          ...toAdoptionApplicantData(validatedFields.data),
          ...householdProfileData,
          status: ApplicationStatus.PENDING,
          
          
          
          
          source: ApplicationSource.STAFF,
        },
        select: { id: true },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: newApplication.id,
          status: ApplicationStatus.PENDING,
          statusChangeReason: "Application submitted by staff on behalf of applicant.",
          changedById: currentPersonId,
        },
      });

      
      
      
      
      const editStamp = householdEditStamp(currentPersonId);
      await tx.householdProfile.upsert({
        where: { personId: validatedPersonId },
        create: { personId: validatedPersonId, ...householdProfileData, ...editStamp },
        update: { ...householdProfileData, ...editStamp },
      });
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return { ok: false, message: error.message };
    }
    console.error("Database Error during staff create application transaction:", error);
    return {
      ok: false,
      message: "Database Error: Failed to create adoption application.",
    };
  }

  revalidatePath(personApplicationsPath(validatedPersonId));
  revalidatePath(ADOPTION_APPLICATIONS_PATH);

  return {
    ok: true,
    message: "Application submitted successfully.",
    redirectTo: safeInternalPath(
      returnTo,
      personApplicationsPath(validatedPersonId)
    ),
  };
};

export const staffCreateAdoptionApplication = RequirePermission(
  AppPermissions.PERSONS_MANAGE
)(_staffCreateAdoptionApplication);

const _staffEditPersonApplication = async (
  applicationId: string,
  personId: string,
  returnTo: string | null,
  values: MyAdoptionAppFormInput
): Promise<FormResult<MyAdoptionAppFormInput>> => {
  const session = await getCachedSession();
  if (!session?.user?.personId) {
    return {
      ok: false,
      message:
        "Unauthorized: You must be logged in with a valid user profile to perform this action.",
    };
  }

  const parsedAppId = cuidSchema.safeParse(applicationId);
  const parsedPersonId = cuidSchema.safeParse(personId);
  if (!parsedAppId.success || !parsedPersonId.success) {
    return { ok: false, message: "Invalid ID format." };
  }
  const validatedAppId = parsedAppId.data;
  const validatedPersonId = parsedPersonId.data;

  
  
  
  
  
  
  

  
  let existingApplication;
  let currentStatus: EffectiveApplicationStatus | undefined;
  try {
    existingApplication = await prisma.adoptionApplication.findUnique({
      where: { id: validatedAppId, applicantId: validatedPersonId },
      select: DERIVATION_APPLICATION_SELECT,
    });
    if (existingApplication) {
      currentStatus = await effectiveApplicationStatus(existingApplication);
    }
  } catch (error) {
    console.error("Database error fetching application:", error);
    return {
      ok: false,
      message: "Database Error: Failed to retrieve application.",
    };
  }
  if (!existingApplication || !currentStatus) {
    return { ok: false, message: "Application not found." };
  }
  if (!STAFF_EDITABLE_STATUSES.includes(currentStatus)) {
    return {
      ok: false,
      message: `Cannot edit ${formatSingleEnumOption(currentStatus).toLowerCase()} applications.`,
    };
  }

  const validatedFields = MyAdoptionAppFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or Invalid Fields. Failed to Update Application.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<MyAdoptionAppFormInput>,
    };
  }

  const householdProfileData = toHouseholdData(validatedFields.data);

  try {
    await prisma.$transaction(async (tx) => {
      
      
      
      const statusNow = await effectiveStatusBehindLock(tx, existingApplication);
      if (!statusNow || !STAFF_EDITABLE_STATUSES.includes(statusNow)) {
        throw new ConflictError(
          "This application has moved to a status staff cannot edit.",
        );
      }

      
      
      
      const { count } = await tx.adoptionApplication.updateMany({
        where: {
          id: validatedAppId,
          applicantId: validatedPersonId,
        },
        data: {
          ...toAdoptionApplicantData(validatedFields.data),
          ...householdProfileData,
          
          
          
          
          lastEditedById: session.user.personId,
          lastEditedAt: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictError("Application not found.");
      }

      const editStamp = householdEditStamp(session.user.personId);
      await tx.householdProfile.upsert({
        where: { personId: validatedPersonId },
        create: { personId: validatedPersonId, ...householdProfileData, ...editStamp },
        update: { ...householdProfileData, ...editStamp },
      });
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return { ok: false, message: error.message };
    }
    console.error("Database Error during staff edit application transaction:", error);
    return { ok: false, message: "Database Error: Failed to update application." };
  }

  revalidatePath(ADOPTION_APPLICATIONS_PATH);
  revalidatePath(personApplicationsPath(validatedPersonId));

  
  
  
  const destination = safeInternalPath(
    returnTo,
    personApplicationsPath(validatedPersonId)
  );

  return {
    ok: true,
    message: "Application updated successfully.",
    redirectTo: destination,
  };
};

export const staffEditPersonApplication = RequirePermission(
  AppPermissions.PERSONS_MANAGE
)(_staffEditPersonApplication);
