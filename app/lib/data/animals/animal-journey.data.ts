import prisma from "@/app/lib/prisma";
import { AnimalActivityType, type OutcomeType } from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import { cuidSchema } from "../../zod-schemas/common.schemas";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";

export type AnimalJourneyLogPayload = Prisma.AnimalActivityLogGetPayload<{
  include: {
    animal: {
      select: {
        name: true;
        intake: {
          select: {
            type: true;
          };
        };
      };
    };
    changedBy: {
      select: {
        name: true;
      };
    };
  };
}>;

export type AnimalJourneyItem = AnimalJourneyLogPayload & {
  
  
  outcome: { type: OutcomeType; reversedAt: Date | null } | null;
};

const _fetchAnimalJourney = async (
  animalId: string,
): Promise<AnimalJourneyItem[]> => {
  const validatedId = cuidSchema.safeParse(animalId);
  if (!validatedId.success) {
    throw new Error("Invalid animal ID format provided.");
  }

  const journeyEventTypes: AnimalActivityType[] = [
    AnimalActivityType.CREATED,
    AnimalActivityType.INTAKE_PROCESSED,
    AnimalActivityType.STATUS_CHANGE,
    AnimalActivityType.OUTCOME_PROCESSED,
    
    
    
    AnimalActivityType.OUTCOME_REVERSED,
    
    
    
    
    AnimalActivityType.FOSTER_PLACED,
    AnimalActivityType.FOSTER_RETURNED,
  ];

  try {
    
    
    
    
    const [journeyLogs, outcomes] = await prisma.$transaction(
      [
        prisma.animalActivityLog.findMany({
          where: {
            animalId: validatedId.data,
            activityType: {
              in: journeyEventTypes,
            },
          },
          include: {
            animal: {
              select: {
                name: true,
                intake: {
                  select: {
                    type: true,
                  },
                },
              },
            },
            changedBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ changedAt: "asc" }, { id: "asc" }],
        }),
        prisma.outcome.findMany({
          where: { animalId: validatedId.data },
          select: { type: true, reversedAt: true },
          
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );

    
    
    
    
    
    
    
    
    const outcomeRows = journeyLogs.filter(
      (log) => log.activityType === AnimalActivityType.OUTCOME_PROCESSED,
    );
    const outcomeOf = new Map(
      outcomeRows.map((log, index) => {
        const outcome = outcomes[outcomeRows.length - 1 - index];
        return [
          log.id,
          outcome
            ? { type: outcome.type, reversedAt: outcome.reversedAt }
            : null,
        ];
      }),
    );
    return journeyLogs.map((log) => ({
      ...log,
      outcome: outcomeOf.get(log.id) ?? null,
    }));
  } catch (error) {
    console.error("Error fetching animal journey:", error);
    throw new Error("Could not fetch the animal's journey.");
  }
};

export const fetchAnimalJourney = RequirePermission(
  AppPermissions.ANIMAL_JOURNEY_READ,
)(_fetchAnimalJourney);
