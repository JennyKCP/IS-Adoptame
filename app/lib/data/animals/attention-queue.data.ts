import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { AnimalListingStatus, TaskStatus } from "@/prisma/generated/enums";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { calendarDay } from "@/app/lib/utils/shelter-day";
import { RequireAllPermissions } from "../../auth/protected-actions";
import {
  ACUTE_HEALTH_STATUSES,
  buildAttentionQueue,
  type AttentionAnimal,
  type AttentionQueueItem,
} from "./attention-queue";

export type { AttentionQueueItem, AttentionReason } from "./attention-queue";























const OPEN_TASK_STATUSES = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];


const attentionAnimalSelect = {
  id: true,
  name: true,
  species: { select: { name: true } },
  currentUnit: {
    select: { name: true, location: { select: { name: true } } },
  },
} satisfies Prisma.AnimalSelect;

type AttentionAnimalRow = Prisma.AnimalGetPayload<{
  select: typeof attentionAnimalSelect;
}>;



const toAttentionAnimal = (animal: AttentionAnimalRow): AttentionAnimal => ({
  id: animal.id,
  name: animal.name,
  species: animal.species.name,
  currentUnit: animal.currentUnit
    ? `${animal.currentUnit.location.name} · ${animal.currentUnit.name}`
    : null,
});






export const _fetchAttentionQueue = async (): Promise<AttentionQueueItem[]> => {
  try {
    
    
    
    
    
    
    
    const today = await getShelterToday();

    const notArchived = {
      listingStatus: { not: AnimalListingStatus.ARCHIVED },
    } satisfies Prisma.AnimalWhereInput;

    const [tasksDue, acuteHealth, fostersOverdue] = await Promise.all([
      
      
      prisma.task.findMany({
        where: {
          status: { in: OPEN_TASK_STATUSES },
          dueDate: { lte: today },
          animal: notArchived,
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          animal: { select: attentionAnimalSelect },
        },
      }),
      
      
      prisma.animal.findMany({
        where: {
          ...notArchived,
          healthStatus: { in: [...ACUTE_HEALTH_STATUSES] },
          tasks: { none: { status: { in: OPEN_TASK_STATUSES } } },
        },
        select: { ...attentionAnimalSelect, healthStatus: true },
      }),
      
      
      
      prisma.fosterPlacement.findMany({
        where: {
          endDate: null,
          expectedEndDate: { lt: today },
          animal: notArchived,
        },
        select: {
          id: true,
          expectedEndDate: true,
          animal: { select: attentionAnimalSelect },
          fosterProfile: {
            select: { person: { select: { name: true } } },
          },
        },
      }),
    ]);

    return buildAttentionQueue({
      tasksDue: tasksDue.map((task) => ({
        animal: toAttentionAnimal(task.animal),
        taskId: task.id,
        title: task.title,
        
        dueDate: calendarDay(task.dueDate!),
        priority: task.priority,
      })),
      acuteHealth: acuteHealth.map((animal) => ({
        animal: toAttentionAnimal(animal),
        
        healthStatus: animal.healthStatus!,
      })),
      fostersOverdue: fostersOverdue.map((placement) => ({
        animal: toAttentionAnimal(placement.animal),
        placementId: placement.id,
        expectedEndDate: calendarDay(placement.expectedEndDate!),
        fosterName: placement.fosterProfile.person.name,
      })),
    });
  } catch (error) {
    console.error("Error fetching the attention queue.", error);
    throw new Error("Error fetching the attention queue.");
  }
};


export const fetchAttentionQueue = RequireAllPermissions(
  AppPermissions.ANIMAL_INFO_READ,
  AppPermissions.ANIMAL_TASK_READ,
)(_fetchAttentionQueue);
