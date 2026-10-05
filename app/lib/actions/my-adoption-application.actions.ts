"use server";

import { cuidSchema } from "../zod-schemas/common.schemas";
import prisma from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  ApplicationSource,
  ApplicationStatus,
} from "@/prisma/generated/enums";
import {
  APPLICANT_EDITABLE_STATUSES,
  BLOCKING_APPLICATION_STATUSES,
  REACTIVATION_BLOCKING_STATUSES,
  formatStatusList,
} from "../utils/application-status";
import { ConflictError, NotFoundError } from "../utils/errors";
import { formatSingleEnumOption } from "../utils/enum-formatter";
import {
  deriveApplicationStatus,
  EffectiveApplicationStatus,
  toDerivationOutcome,
} from "../utils/derive-application-status";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatus,
  effectiveApplicationStatuses,
  effectiveStatusBehindLock,
  lockAnimal,
  lockPerson,
} from "../data/application-status.data";
import {
  MyAdoptionAppFormSchema,
  toAdoptionApplicantData,
  type MyAdoptionAppFormInput,
} from "../zod-schemas/myAdoptionApplication.schema";
import {
  householdEditStamp,
  toHouseholdData,
} from "../zod-schemas/household-profile.schemas";
import { SessionUser, withAuthenticatedUser } from "../auth/protected-actions";
import { ActionResult } from "../types";
import { z } from "zod";
import { isOwnedByUser } from "../auth/ownership";
import { syncPersonToUser } from "../services/user-person-sync";
import {
  checkWithdrawal,
  recordWithdrawal,
  type WithdrawableApplication,
} from "../services/application-withdrawal";
import type { FieldErrors, FormResult } from "@/app/lib/action-result";

type MyAdoptionAppResult = FormResult<MyAdoptionAppFormInput>;




const MY_APPLICATIONS_PATH = "/dashboard/my-adoption-applications";

const _updateMyAdoptionApp = async (
  user: SessionUser, 
  applicationId: string, 
  values: MyAdoptionAppFormInput,
): Promise<MyAdoptionAppResult> => {
  
  const parsedApplicationId = cuidSchema.safeParse(applicationId);
  if (!parsedApplicationId.success) {
    return {
      ok: false,
      message: "Invalid Adoption Application ID format.",
    };
  }
  const validatedApplicationId = parsedApplicationId.data;

  
  let application;
  try {
    application = await prisma.adoptionApplication.findUnique({
      where: { id: validatedApplicationId },
      select: { applicantId: true, ...DERIVATION_APPLICATION_SELECT },
    });
  } catch (error) {
    console.error(
      "Database error while verifying application ownership:",
      error,
    );
    return {
      ok: false,
      message: "Database Error: Failed to verify application ownership.",
    };
  }

  if (!isOwnedByUser(application, user.personId)) {
    return { ok: false, message: "Adoption Application not found." };
  }

  
  
  
  const currentStatus = await effectiveApplicationStatus(application);

  
  
  if (!APPLICANT_EDITABLE_STATUSES.includes(currentStatus)) {
    return {
      ok: false,
      message: `Cannot update application. Its status is currently "${formatSingleEnumOption(currentStatus)}". Only ${formatStatusList(APPLICANT_EDITABLE_STATUSES)} applications can be modified.`,
    };
  }

  
  
  const validatedFields = MyAdoptionAppFormSchema.safeParse(values);

  
  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing Fields. Failed to Update Adoption Application.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<MyAdoptionAppFormInput>,
    };
  }

  
  
  
  
  
  
  
  
  
  const dataToUpdate = {
    ...toAdoptionApplicantData(validatedFields.data),
    ...toHouseholdData(validatedFields.data),
    lastEditedById: user.personId,
    lastEditedAt: new Date(),
  };

  
  
  
  
  try {
    await prisma.$transaction(async (tx) => {
      const statusNow = await effectiveStatusBehindLock(tx, application);
      if (!statusNow || !APPLICANT_EDITABLE_STATUSES.includes(statusNow)) {
        throw new ConflictError(
          "This application can no longer be edited. Its status changed while you were editing it.",
        );
      }

      
      
      const { count } = await tx.adoptionApplication.updateMany({
        where: {
          id: validatedApplicationId,
          applicantId: user.personId,
        },
        data: dataToUpdate,
      });
      if (count === 0) {
        throw new ConflictError("Adoption Application not found.");
      }
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return { ok: false, message: error.message };
    }
    console.error(
      `Database Error updating adoption application ${validatedApplicationId}:`,
      error,
    );
    return {
      ok: false,
      message: "Database Error: Failed to Update Adoption Application.",
    };
  }

  
  revalidatePath(MY_APPLICATIONS_PATH);
  revalidatePath(`${MY_APPLICATIONS_PATH}/${validatedApplicationId}/edit`);

  return {
    ok: true,
    message: "Application updated successfully.",
    redirectTo: MY_APPLICATIONS_PATH,
  };
};

const _withdrawMyAdoptionApplication = async (
  user: SessionUser, 
  applicationId: string,
): Promise<ActionResult> => {
  
  const parsedApplicationId = cuidSchema.safeParse(applicationId);
  if (!parsedApplicationId.success) {
    return {
      success: false,
      message: "Invalid Adoption Application ID format.",
    };
  }
  const validatedApplicationId = parsedApplicationId.data;

  
  let withdrawable: WithdrawableApplication;
  try {
    withdrawable = await checkWithdrawal(validatedApplicationId, user.personId);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      return { success: false, message: error.message };
    }
    console.error(
      "Error verifying application ownership for withdrawal:",
      error,
    );
    return {
      success: false,
      message:
        "A server error occurred while verifying the application. Please try again.",
    };
  }

  
  try {
    await prisma.$transaction((tx) =>
      recordWithdrawal(tx, withdrawable, user.personId),
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return { success: false, message: error.message };
    }
    console.error(
      `Database Error withdrawing adoption application ${validatedApplicationId}:`,
      error,
    );
    return {
      success: false,
      message: "Database Error: Failed to withdraw Adoption Application.",
    };
  }

  
  
  revalidatePath(MY_APPLICATIONS_PATH);
  revalidatePath(`${MY_APPLICATIONS_PATH}/${validatedApplicationId}`);
  revalidatePath(`${MY_APPLICATIONS_PATH}/${validatedApplicationId}/edit`);

  return { success: true, message: "Application withdrawn successfully." };
};

const _reactivateMyAdoptionApplication = async (
  user: SessionUser, 
  applicationId: string,
): Promise<ActionResult> => {
  
  const parsedApplicationId = cuidSchema.safeParse(applicationId);
  if (!parsedApplicationId.success) {
    return {
      success: false,
      message: "Invalid Adoption Application ID format.",
    };
  }
  const validatedApplicationId = parsedApplicationId.data;

  
  let application;
  try {
    application = await prisma.adoptionApplication.findUnique({
      where: { id: validatedApplicationId },
      select: {
        applicantId: true,
        ...DERIVATION_APPLICATION_SELECT,
        animal: { select: { listingStatus: true } },
      },
    });
  } catch (error) {
    console.error("Error verifying application for reactivation:", error);
    return {
      success: false,
      message:
        "A server error occurred while verifying the application. Please try again.",
    };
  }

  if (!isOwnedByUser(application, user.personId)) {
    return { success: false, message: "Adoption Application not found." };
  }

  if (application.animal.listingStatus !== "PUBLISHED") {
    return {
      success: false,
      message:
        "Cannot reactivate application. This animal is no longer available for adoption.",
    };
  }

  if (application.status !== ApplicationStatus.WITHDRAWN) {
    return {
      success: false,
      message: `Cannot reactivate application. Its status is currently "${formatSingleEnumOption(application.status)}".`,
    };
  }

  
  try {
    await prisma.$transaction(
      async (tx) => {
        
        
        await lockAnimal(tx, application.animalId);

        
        
        
        
        
        const current = await tx.adoptionApplication.findUnique({
          where: { id: validatedApplicationId },
          select: { status: true, animal: { select: { listingStatus: true } } },
        });
        if (!current) {
          throw new ConflictError("Adoption Application not found.");
        }
        if (current.animal.listingStatus !== "PUBLISHED") {
          throw new ConflictError(
            "Cannot reactivate application. This animal is no longer available for adoption.",
          );
        }
        if (current.status !== ApplicationStatus.WITHDRAWN) {
          throw new ConflictError(
            `Cannot reactivate application. Its status is currently "${formatSingleEnumOption(current.status)}".`,
          );
        }

        
        
        
        
        
        
        
        
        
        const outcomes = await tx.outcome.findMany({
          where: { animalId: application.animalId },
          select: {
            createdAt: true,
            type: true,
            adoptionApplicationId: true,
            reversedAt: true,
          },
        });
        const statusIfReactivated = deriveApplicationStatus(
          {
            id: application.id,
            reviewStatus: ApplicationStatus.PENDING,
            submittedAt: application.submittedAt,
          },
          outcomes.map(toDerivationOutcome),
        );
        if (statusIfReactivated === EffectiveApplicationStatus.CLOSED) {
          throw new ConflictError(
            "Cannot reactivate application. This animal is no longer available for adoption.",
          );
        }

        
        
        
        
        
        
        
        
        
        
        const siblings = await tx.adoptionApplication.findMany({
          where: {
            applicantId: user.personId,
            animalId: application.animalId,
            id: { not: validatedApplicationId },
          },
          select: DERIVATION_APPLICATION_SELECT,
        });
        const siblingStatuses = await effectiveApplicationStatuses(
          siblings,
          tx,
        );
        const blocker = siblings.find((sibling) =>
          REACTIVATION_BLOCKING_STATUSES.includes(
            siblingStatuses.get(sibling.id)!,
          ),
        );
        if (blocker) {
          throw new ConflictError(
            siblingStatuses.get(blocker.id) === ApplicationStatus.REJECTED
              ? "Cannot reactivate application. A previous application for this animal was not approved."
              : "Cannot reactivate application. You already have an active application for this animal.",
          );
        }

        
        await tx.adoptionApplication.update({
          where: { id: validatedApplicationId },
          data: { status: ApplicationStatus.PENDING },
        });
        
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: validatedApplicationId,
            status: ApplicationStatus.PENDING,
            statusChangeReason: "Application reactivated by user.",
            changedById: user.personId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return { success: false, message: error.message };
    }
    console.error(
      `Database Error reactivating adoption application ${validatedApplicationId}:`,
      error,
    );
    return {
      success: false,
      message: "Database Error: Failed to reactivate Adoption Application.",
    };
  }

  revalidatePath(MY_APPLICATIONS_PATH);
  revalidatePath(`${MY_APPLICATIONS_PATH}/${validatedApplicationId}`);

  return { success: true, message: "Application reactivated successfully." };
};


const _createMyAdoptionApp = async (
  user: SessionUser, 
  animalId: string,
  values: MyAdoptionAppFormInput,
): Promise<MyAdoptionAppResult> => {
  const parsedAnimalId = cuidSchema.safeParse(animalId);
  if (!parsedAnimalId.success) {
    return {
      ok: false,
      message: "Invalid Animal ID format.",
    };
  }
  const validatedAnimalId = parsedAnimalId.data;

  const validatedFields = MyAdoptionAppFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing Fields. Failed to Submit Application.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<MyAdoptionAppFormInput>,
    };
  }

  
  
  const {
    applicantName,
    applicantPhone,
    applicantAddressLine1,
    applicantAddressLine2,
    applicantCity,
    applicantState,
    applicantZipCode,
  } = validatedFields.data;

  
  
  
  const householdProfileData = toHouseholdData(validatedFields.data);

  const dataToCreate = {
    ...toAdoptionApplicantData(validatedFields.data),
    ...householdProfileData,
    applicantId: user.personId,
    animalId: validatedAnimalId,
    source: ApplicationSource.SELF,
  };

  try {
    await prisma.$transaction(
      async (tx) => {
        
        
        
        
        
        
        
        await lockPerson(tx, user.personId);
        await lockAnimal(tx, validatedAnimalId);

        const animal = await tx.animal.findUnique({
          where: { id: validatedAnimalId },
          select: { listingStatus: true },
        });

        if (animal?.listingStatus !== "PUBLISHED") {
          throw new Error("This animal is no longer available for adoption.");
        }

        
        
        
        
        
        
        
        const existingApplications = await tx.adoptionApplication.findMany({
          where: {
            applicantId: user.personId,
            animalId: validatedAnimalId,
          },
          select: DERIVATION_APPLICATION_SELECT,
        });
        const existingStatuses = await effectiveApplicationStatuses(
          existingApplications,
          tx,
        );
        if (
          [...existingStatuses.values()].some((status) =>
            BLOCKING_APPLICATION_STATUSES.includes(status),
          )
        ) {
          throw new ConflictError(
            "You already have an application for this animal.",
          );
        }

        await tx.adoptionApplication.create({
          data: {
            ...dataToCreate,
            history: {
              create: {
                status: "PENDING",
                statusChangeReason: "Application submitted by user.",
                changedById: user.personId,
              },
            },
          },
        });

        
        
        const editStamp = householdEditStamp(user.personId);
        await tx.householdProfile.upsert({
          where: { personId: user.personId },
          create: { personId: user.personId, ...householdProfileData, ...editStamp },
          update: { ...householdProfileData, ...editStamp },
        });

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        await tx.person.update({
          where: { id: user.personId },
          data: {
            name: applicantName,
            phone: applicantPhone,
            address: applicantAddressLine2
              ? `${applicantAddressLine1}, ${applicantAddressLine2}`
              : applicantAddressLine1,
            city: applicantCity,
            state: applicantState,
            zipCode: applicantZipCode,
          },
        });

        
        
        
        await syncPersonToUser(tx, user.personId, { name: applicantName });
      },
      {
        isolationLevel: "Serializable",
      },
    );
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return { ok: false, message: error.message };
    }
    console.error("Error submitting adoption application:", error);
    return {
      ok: false,
      message:
        "Database Error: Failed to submit application. Please try again.",
    };
  }
  revalidatePath(`/pets/${validatedAnimalId}`);
  revalidatePath(MY_APPLICATIONS_PATH);

  return {
    ok: true,
    message: "Application submitted successfully.",
    redirectTo: MY_APPLICATIONS_PATH,
  };
};

export const updateMyAdoptionApp = withAuthenticatedUser(_updateMyAdoptionApp);

export const withdrawMyAdoptionApplication = withAuthenticatedUser(
  _withdrawMyAdoptionApplication,
);

export const createMyAdoptionApp = withAuthenticatedUser(_createMyAdoptionApp);

export const reactivateMyAdoptionApplication = withAuthenticatedUser(
  _reactivateMyAdoptionApplication,
);
