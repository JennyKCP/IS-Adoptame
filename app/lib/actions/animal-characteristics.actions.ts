"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { cuidSchema } from "../zod-schemas/common.schemas";
import {
  withAuthenticatedUser,
  RequirePermission,
  type SessionUser,
} from "../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { AnimalActivityType } from "@/prisma/generated/enums";
import type { FieldErrors, FormResult } from "@/app/lib/action-result";


const updateCharacteristicsSchema = z.object({
  animalId: cuidSchema,
  characteristicIds: z.array(cuidSchema),
});

type CharacteristicsInput = z.input<typeof updateCharacteristicsSchema>;
type CharacteristicsResult = FormResult<CharacteristicsInput>;

const listNames = (names: string[]) => names.join(", ");


const _updateAnimalCharacteristics = async (
  user: SessionUser, 
  data: CharacteristicsInput,
): Promise<CharacteristicsResult> => {
  const validation = updateCharacteristicsSchema.safeParse(data);
  if (!validation.success) {
    return {
      ok: false,
      message: "Invalid input. Please check the provided data.",
      fieldErrors: z.flattenError(validation.error)
        .fieldErrors as FieldErrors<CharacteristicsInput>,
    };
  }

  const { animalId, characteristicIds } = validation.data;
  const now = new Date();

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const [animal, catalog] = await Promise.all([
        tx.animal.findUnique({
          where: { id: animalId },
          select: {
            animalCharacteristics: {
              where: { removedAt: null },
              select: {
                characteristicId: true,
                characteristic: { select: { name: true, deletedAt: true } },
              },
            },
          },
        }),
        tx.characteristic.findMany({
          where: { id: { in: characteristicIds } },
          select: { id: true, name: true, deletedAt: true },
        }),
      ]);
      if (!animal) {
        throw new Error("Animal not found.");
      }

      const catalogById = new Map(catalog.map((c) => [c.id, c]));
      if (characteristicIds.some((id) => catalogById.get(id)?.deletedAt !== null)) {
        return {
          ok: false as const,
          message:
            "One or more characteristics are no longer available and cannot be assigned.",
        };
      }

      const activeIds = new Set(
        animal.animalCharacteristics.map((ac) => ac.characteristicId),
      );
      const target = new Set(characteristicIds);
      const toAdd = characteristicIds
        .filter((id) => !activeIds.has(id))
        .map((id) => ({
          characteristicId: id,
          characteristicName: catalogById.get(id)!.name,
        }));
      const toRemove = animal.animalCharacteristics
        .filter(
          (ac) => !ac.characteristic.deletedAt && !target.has(ac.characteristicId),
        )
        .map((ac) => ({
          characteristicId: ac.characteristicId,
          characteristicName: ac.characteristic.name,
        }));

      for (const { characteristicId } of toAdd) {
        await tx.animalCharacteristic.upsert({
          where: {
            animalId_characteristicId: { animalId, characteristicId },
          },
          create: {
            animalId,
            characteristicId,
            assignedById: user.personId,
            assignedAt: now,
          },
          
          
          update: {
            assignedById: user.personId,
            assignedAt: now,
            sourceAssessmentId: null,
            removedAt: null,
            removedById: null,
          },
        });
      }

      if (toRemove.length > 0) {
        await tx.animalCharacteristic.updateMany({
          where: {
            animalId,
            characteristicId: { in: toRemove.map((t) => t.characteristicId) },
            removedAt: null,
          },
          data: { removedAt: now, removedById: user.personId },
        });
      }

      if (toAdd.length === 0 && toRemove.length === 0) {
        return { ok: true as const };
      }

      const names = (traits: { characteristicName: string }[]) =>
        listNames(traits.map((t) => t.characteristicName));
      const parts = [
        toAdd.length > 0 && `added ${names(toAdd)}`,
        toRemove.length > 0 && `removed ${names(toRemove)}`,
      ].filter(Boolean);

      await tx.animalActivityLog.create({
        data: {
          animalId,
          activityType: AnimalActivityType.FIELD_UPDATE,
          changedById: user.personId,
          changeSummary: `Characteristics updated: ${parts.join("; ")}.`,
        },
      });
      return { ok: true as const };
    });

    if (!outcome.ok) {
      return { ok: false, message: outcome.message };
    }

    revalidatePath(`/dashboard/animals/${animalId}/characteristics`);
    
    
    revalidatePath(`/dashboard/animals/${animalId}/assessments`);
    revalidatePath("/dashboard/animals/[id]/assessments/[assessmentId]", "page");
    revalidatePath(`/dashboard/animals/${animalId}`);
    revalidatePath(`/pets/${animalId}`);
    return {
      ok: true,
      message: "Characteristics updated successfully.",
    };
  } catch (error) {
    console.error("Failed to update animal characteristics:", error);
    return {
      ok: false,
      message: "Failed to update characteristics due to a server error.",
    };
  }
};

export const updateAnimalCharacteristics = withAuthenticatedUser(
  RequirePermission(AppPermissions.ANIMAL_CHARACTERISTICS_MANAGE)(
    _updateAnimalCharacteristics,
  ),
);
