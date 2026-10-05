"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/app/lib/prisma";
import { z } from "zod";
import { cuidSchema } from "../zod-schemas/common.schemas";
import {
  CreateAnimalFormSchema,
  AnimalEditFormSchema,
  type CreateAnimalFormInput,
  type AnimalEditFormInput,
} from "../zod-schemas/animal.schemas";
import {
  RequirePermission,
  SessionUser,
  withAuthenticatedUser,
} from "../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import {
  AnimalActivityType,
  AnimalListingStatus,
  ApplicationStatus,
  IntakeType,
} from "@/prisma/generated/enums";
import { buildLocationChangeSummary } from "../utils/location-activity";
import { ConflictError, NotFoundError } from "../utils/errors";
import { findLiveUnitForPlacement } from "../services/unit-housing";
import { createAnimalFromForm } from "../services/animal-creation";
import { toAnimalData } from "../utils/animal-data";
import { del } from "@vercel/blob";
import { isDemo } from "@/lib/flags";
import type { FieldErrors, FormResult } from "@/app/lib/action-result";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatuses,
  lockAnimal,
} from "../data/application-status.data";

const _createAnimal = async (
  user: SessionUser,
  values: CreateAnimalFormInput,
): Promise<FormResult<CreateAnimalFormInput>> => {
  const staffMemberId = user.personId;

  if (!staffMemberId) {
    return {
      ok: false,
      message:
        "Authentication Error: Your user account is not associated with a person record.",
    };
  }

  const validatedFields = CreateAnimalFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or invalid fields. Failed to create intake record.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<CreateAnimalFormInput>,
    };
  }

  const { intakeType, surrenderingPersonId } = validatedFields.data;

  if (intakeType === IntakeType.OWNER_SURRENDER) {
    const parsedPersonId = cuidSchema.safeParse(surrenderingPersonId);
    if (!parsedPersonId.success) {
      return {
        ok: false,
        message: "Missing or invalid fields. Failed to create intake record.",
        fieldErrors: {
          surrenderingPersonId: ["A surrendering person is required."],
        } as FieldErrors<CreateAnimalFormInput>,
      };
    }
  }

  try {
    
    
    const created = await createAnimalFromForm(
      validatedFields.data,
      staffMemberId,
    );
    if ("refusal" in created) {
      return {
        ok: false,
        message: created.refusal,
        fieldErrors: { intakeDate: [created.refusal] },
      };
    }
  } catch (error) {
    console.error("Database Error creating intake record:", error);
    return {
      ok: false,
      message: "Database Error: Failed to create intake record.",
    };
  }

  revalidatePath("/dashboard/animals");

  return {
    ok: true,
    message: "Animal intake created successfully.",
    redirectTo: "/dashboard/animals",
  };
};

const _updateAnimal = async (
  user: SessionUser,
  animalId: string,
  values: AnimalEditFormInput,
): Promise<FormResult<AnimalEditFormInput>> => {
  const parsedId = cuidSchema.safeParse(animalId);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid Animal ID." };
  }
  const validatedAnimalId = parsedId.data;
  const staffMemberId = user.personId;

  const validatedFields = AnimalEditFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or invalid fields. Failed to update animal.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<AnimalEditFormInput>,
    };
  }

  const {
    animalName,
    estimatedBirthDate,
    sex,
    healthStatus,
    listingStatus,
    species: speciesId,
    breed: breedId,
    primaryColor: primaryColorId,
    additionalColors: additionalColorIds,
    heightCm,
  } = validatedFields.data;

  
  
  
  
  
  

  const mapped = toAnimalData(validatedFields.data);

  
  
  const allColorIds = Array.from(
    new Set([primaryColorId, ...additionalColorIds]),
  );

  try {
    await prisma.$transaction(async (tx) => {
      
      
      
      
      
      
      await lockAnimal(tx, validatedAnimalId);
      const currentAnimal = await tx.animal.findUnique({
        where: { id: validatedAnimalId },
        select: {
          listingStatus: true,
          publishedAt: true,
          currentUnitId: true,
          currentUnit: {
            select: { name: true, location: { select: { name: true } } },
          },
        },
      });

      if (!currentAnimal) {
        throw new NotFoundError("Animal not found.");
      }

      
      
      
      
      
      if (listingStatus !== currentAnimal.listingStatus) {
        if (currentAnimal.listingStatus === AnimalListingStatus.ARCHIVED) {
          throw new ConflictError(
            "This animal is archived. To make it available again, please use the re-intake process."
          );
        }

        const isChangingToAvailable =
          listingStatus === AnimalListingStatus.PUBLISHED ||
          listingStatus === AnimalListingStatus.DRAFT;

        if (
          currentAnimal.listingStatus === AnimalListingStatus.PENDING_ADOPTION &&
          isChangingToAvailable
        ) {
          
          
          
          
          const approvedApplications = await tx.adoptionApplication.findMany({
            where: {
              animalId: validatedAnimalId,
              status: ApplicationStatus.APPROVED,
            },
            select: DERIVATION_APPLICATION_SELECT,
          });
          const statuses = await effectiveApplicationStatuses(
            approvedApplications,
            tx,
          );

          if ([...statuses.values()].includes(ApplicationStatus.APPROVED)) {
            throw new ConflictError(
              "Cannot change status. This animal has an approved adoption application. Please reject or withdraw the application first."
            );
          }
        } else if (
          listingStatus === AnimalListingStatus.ARCHIVED ||
          listingStatus === AnimalListingStatus.PENDING_ADOPTION
        ) {
          
          
          throw new ConflictError(
            "Invalid Action: This status can only be set via the outcome or application approval process."
          );
        }
      }

      const isArchived =
        currentAnimal.listingStatus === AnimalListingStatus.ARCHIVED;

      const speciesRecord = await tx.species.findUnique({
        where: { id: speciesId },
        select: { name: true },
      });

      if (!speciesRecord) {
        throw new NotFoundError("The specified species does not exist.");
      }

      
      const validColorCount = await tx.color.count({
        where: { id: { in: allColorIds }, deletedAt: null },
      });
      if (validColorCount !== allColorIds.length) {
        throw new ConflictError(
          "One or more selected colors are no longer available. Please refresh and try again.",
        );
      }

      
      
      
      
      let resolvedUnitId: string | null = null;
      let resolvedUnitLabel: {
        name: string;
        location: { name: string };
      } | null = null;
      
      
      
      
      if (mapped.currentUnitId && !isArchived) {
        const unit = await findLiveUnitForPlacement(tx, mapped.currentUnitId);
        resolvedUnitId = unit?.id ?? null;
        resolvedUnitLabel = unit
          ? { name: unit.name, location: unit.location }
          : null;
      }

      let publishedAt = currentAnimal.publishedAt;
      if (
        listingStatus === AnimalListingStatus.PUBLISHED &&
        !currentAnimal.publishedAt
      ) {
        publishedAt = new Date();
      }

      await tx.animal.update({
        where: { id: validatedAnimalId },
        data: {
          name: animalName,
          birthDate: estimatedBirthDate,
          sex: sex,
          size: mapped.size,
          description: mapped.description,
          
          
          
          heightCm,
          healthStatus: healthStatus,
          listingStatus: listingStatus,
          publishedAt: publishedAt,
          microchipNumber: mapped.microchipNumber,
          isSpayedNeutered: mapped.isSpayedNeutered,
          currentUnit: resolvedUnitId
            ? { connect: { id: resolvedUnitId } }
            : { disconnect: true },
          species: { connect: { id: speciesId } },
          breeds: { set: [{ id: breedId }] },
          colors: { set: allColorIds.map((id) => ({ id })) },
          primaryColor: { connect: { id: primaryColorId } },
        },
      });

      if (currentAnimal.listingStatus !== listingStatus && staffMemberId) {
        await tx.animalActivityLog.create({
          data: {
            animalId: validatedAnimalId,
            activityType: AnimalActivityType.STATUS_CHANGE,
            changedById: staffMemberId,
            changeSummary: `Listing status changed from ${currentAnimal.listingStatus} to ${listingStatus}.`,
          },
        });
      }

      
      
      if (currentAnimal.currentUnitId !== resolvedUnitId && staffMemberId) {
        await tx.animalActivityLog.create({
          data: {
            animalId: validatedAnimalId,
            activityType: AnimalActivityType.LOCATION_CHANGE,
            changedById: staffMemberId,
            changeSummary: buildLocationChangeSummary(
              currentAnimal.currentUnit,
              resolvedUnitLabel
            ),
          },
        });
      }
    });
  } catch (error) {
    console.error("Database Error updating animal:", error);
    if (error instanceof ConflictError || error instanceof NotFoundError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "Database Error: Failed to update animal record.",
    };
  }

  revalidatePath("/dashboard/animals");
  revalidatePath(`/dashboard/animals/${validatedAnimalId}`);

  return {
    ok: true,
    message: "Animal updated successfully.",
    redirectTo: `/dashboard/animals/${validatedAnimalId}`,
  };
};

const _togglePetFavorite = async (
  user: SessionUser,
  animalId: string
): Promise<{ success: boolean; message: string }> => {
  const personId = user.personId;
  if (!personId) {
    return { success: false, message: "Access Denied." };
  }
  const parsedPetId = cuidSchema.safeParse(animalId);
  if (!parsedPetId.success) {
    return { success: false, message: "Invalid Pet ID format." };
  }
  const validatedAnimalId = parsedPetId.data;

  try {
    const pet = await prisma.animal.findUnique({
      where: { id: validatedAnimalId },
      select: { listingStatus: true },
    });

    if (!pet) {
      return { success: false, message: "Pet not found." };
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_animalId: {
          userId: personId,
          animalId: validatedAnimalId,
        },
      },
    });

    if (existingFavorite) {
      
      
      await prisma.favorite.delete({
        where: {
          userId_animalId: {
            userId: personId,
            animalId: validatedAnimalId,
          },
        },
      });

      revalidatePath("/pets");
      revalidatePath("/pets/favorites");
      revalidatePath(`/pets/${validatedAnimalId}`);

      return { success: true, message: "Removed from favorites." };
    } else {
      
      
      
      const isFavoritableStatus =
        pet.listingStatus === "PUBLISHED" ||
        pet.listingStatus === "PENDING_ADOPTION";
      if (!isFavoritableStatus) {
        return {
          success: false,
          message:
            "This pet is not available for interaction at its current status.",
        };
      }

      await prisma.favorite.create({
        data: {
          userId: personId,
          animalId: validatedAnimalId,
        },
      });

      revalidatePath("/pets");
      revalidatePath("/pets/favorites");
      revalidatePath(`/pets/${validatedAnimalId}`);
      return { success: true, message: "Added to favorites!" };
    }
  } catch (error) {
    console.error(
      `Database error toggling favorite for pet ${validatedAnimalId} and user ${personId}:`,
      error
    );
    return {
      success: false,
      message: "An error occurred. Please try again.",
    };
  }
};

const _deleteAnimalImage = async (
  user: SessionUser,
  imageId: string,
  imageUrl: string,
  animalId: string
): Promise<{ success: boolean; message: string }> => {
  
  const parsedImageId = cuidSchema.safeParse(imageId);
  if (!parsedImageId.success) {
    return { success: false, message: 'Invalid Image ID.' };
  }

  try {
    
    
    if (!isDemo) {
      await del(imageUrl);
    }

    
    await prisma.animalImage.delete({
      where: { id: parsedImageId.data },
    });

    
    
    revalidatePath(`/dashboard/animals/${animalId}/photos`);
    revalidatePath(`/dashboard/animals/${animalId}`);

    return { success: true, message: 'Image deleted successfully.' };
  } catch (error) {
    console.error('Error deleting animal image:', error);
    return { success: false, message: 'Failed to delete image.' };
  }
};

const _reorderAnimalImages = async (
  user: SessionUser,
  animalId: string,
  orderedImageIds: string[]
): Promise<{ success: boolean; message: string }> => {
  const parsedId = cuidSchema.safeParse(animalId);
  if (!parsedId.success) {
    return { success: false, message: "Invalid Animal ID." };
  }
  const validatedAnimalId = parsedId.data;

  const parsedImageIds = z
    .array(cuidSchema)
    .min(1, { error: "No photos were provided to reorder." })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "The photo order contains a duplicate.",
    })
    .safeParse(orderedImageIds);
  if (!parsedImageIds.success) {
    return { success: false, message: "Invalid photo order." };
  }
  const submittedIds = parsedImageIds.data;

  try {
    
    
    
    
    
    
    const existingImages = await prisma.animalImage.findMany({
      where: { animalId: validatedAnimalId },
      select: { id: true },
    });
    const existingIds = new Set(existingImages.map((image) => image.id));
    const matchesCurrentSet =
      submittedIds.length === existingIds.size &&
      submittedIds.every((id) => existingIds.has(id));
    if (!matchesCurrentSet) {
      return {
        success: false,
        message:
          "This photo list is out of date — it may have changed in another tab. Refresh the page and try again.",
      };
    }

    
    
    
    
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < submittedIds.length; index++) {
        await tx.animalImage.update({
          where: { id: submittedIds[index], animalId: validatedAnimalId },
          data: { sortOrder: index },
        });
      }
    });
  } catch (error) {
    console.error("Database Error: Failed to reorder animal images.", error);
    return {
      success: false,
      message: "Database Error: Failed to update the photo order.",
    };
  }

  
  
  
  revalidatePath(`/dashboard/animals/${validatedAnimalId}/photos`);
  revalidatePath(`/dashboard/animals/${validatedAnimalId}`);
  revalidatePath(`/pets/${validatedAnimalId}`);
  revalidatePath("/pets");
  revalidatePath("/");

  return { success: true, message: "Photo order updated." };
};

export const deleteAnimalImage = withAuthenticatedUser(
  RequirePermission(AppPermissions.ANIMAL_PHOTO_MANAGE)(_deleteAnimalImage)
);

export const reorderAnimalImages = withAuthenticatedUser(
  RequirePermission(AppPermissions.ANIMAL_PHOTO_MANAGE)(_reorderAnimalImages)
);

export const createAnimal = withAuthenticatedUser(
  RequirePermission(AppPermissions.INTAKE_MANAGE)(_createAnimal)
);

export const updateAnimal = withAuthenticatedUser(
  RequirePermission(AppPermissions.ANIMAL_INFO_MANAGE)(_updateAnimal)
);

export const toggleAnimalFavorite = withAuthenticatedUser(_togglePetFavorite);