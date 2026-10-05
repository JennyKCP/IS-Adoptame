import {
  getShelterSettings,
  getShelterToday,
} from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import {
  AnimalHealthStatus,
  AnimalListingStatus,
  OutcomeType,
} from "@/prisma/generated/enums";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../auth/protected-actions";
import { Prettify } from "../utils/type-utils";
import {
  calendarDay,
  countByShelterDay,
  shiftDayKey,
  type CalendarDay,
} from "../utils/shelter-day";
import { resolveDashboardMonthBoundaries } from "./dashboard-month-boundaries";

export type PetCardDataType = {
  totalPets: number;
  adoptedPetsCount: number;
  pendingPetsCount: number;
  publishedPetsCount: number;
  todoTasksCount: number;
  trends: {
    totalPetsChange: number;
    adoptedPetsChange: number;
    publishedPetsChange: number;
    todoTasksChange: number;
  };
};

const _fetchAnimalCardData = async (): Promise<PetCardDataType> => {
  try {
    const [today, settings] = await Promise.all([
      getShelterToday(),
      getShelterSettings(),
    ]);
    const {
      currentMonthFromDay,
      lastMonthFromDay,
      lastMonthToDay,
      startOfCurrentMonth,
      startOfLastMonth,
    } = resolveDashboardMonthBoundaries(today, settings.timezone);

    
    const [
      totalPets,
      adoptedPetsCount,
      pendingPetsCount,
      publishedPetsCount,
      todoTasksCount,
    ] = await Promise.all([
      prisma.animal.count(),
      
      prisma.outcome.count({
        where: {
          type: OutcomeType.ADOPTION,
          reversedAt: null,
        },
      }),
      prisma.animal.count({
        where: {
          listingStatus: AnimalListingStatus.PENDING_ADOPTION,
        },
      }),
      prisma.animal.count({
        where: {
          listingStatus: AnimalListingStatus.PUBLISHED,
        },
      }),
      prisma.task.count({
        where: {
          status: "TODO",
        },
      }),
    ]);

    
    const [
      currentMonthAnimals,
      currentMonthAdoptions,
      currentMonthPublished,
      currentMonthTasks,
    ] = await Promise.all([
      prisma.animal.count({
        where: {
          createdAt: {
            gte: startOfCurrentMonth,
          },
        },
      }),
      prisma.outcome.count({
        where: {
          type: OutcomeType.ADOPTION,
          reversedAt: null,
          outcomeDate: {
            gte: currentMonthFromDay,
          },
        },
      }),
      prisma.animal.count({
        where: {
          publishedAt: {
            gte: startOfCurrentMonth,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "TODO",
          createdAt: {
            gte: startOfCurrentMonth,
          },
        },
      }),
    ]);

    
    const [
      lastMonthAnimals,
      lastMonthAdoptions,
      lastMonthPublished,
      lastMonthTasks,
    ] = await Promise.all([
      prisma.animal.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
      prisma.outcome.count({
        where: {
          type: OutcomeType.ADOPTION,
          reversedAt: null,
          outcomeDate: {
            gte: lastMonthFromDay,
            lte: lastMonthToDay,
          },
        },
      }),
      prisma.animal.count({
        where: {
          publishedAt: {
            gte: startOfLastMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "TODO",
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
    ]);

    
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalPets,
      adoptedPetsCount,
      pendingPetsCount,
      publishedPetsCount,
      todoTasksCount,
      trends: {
        totalPetsChange: calculateChange(currentMonthAnimals, lastMonthAnimals),
        adoptedPetsChange: calculateChange(
          currentMonthAdoptions,
          lastMonthAdoptions,
        ),
        publishedPetsChange: calculateChange(
          currentMonthPublished,
          lastMonthPublished,
        ),
        todoTasksChange: calculateChange(currentMonthTasks, lastMonthTasks),
      },
    };
  } catch (error) {
    console.error("Error fetching card data.", error);
    throw new Error("Error fetching card data.");
  }
};

export type ChartDataPoint = {
  date: string;
  intakes: number;
  outcomes: number;
};

export type ChartData = ChartDataPoint[];

const _fetchChartData = async (): Promise<ChartData> => {
  try {
    const days = 90;

    
    
    
    const startKey = shiftDayKey(await getShelterToday(), -(days - 1));

    const [intakeData, outcomeData] = await Promise.all([
      prisma.intake.findMany({
        where: { intakeDate: { gte: startKey } },
        select: { intakeDate: true },
      }),
      prisma.outcome.findMany({
        where: { outcomeDate: { gte: startKey }, reversedAt: null },
        select: { outcomeDate: true },
      }),
    ]);

    const intakeMap = countByShelterDay(
      intakeData.map((item) => calendarDay(item.intakeDate)),
    );
    const outcomeMap = countByShelterDay(
      outcomeData.map((item) => calendarDay(item.outcomeDate)),
    );

    const chartData = Array.from({ length: days }, (_, i) => {
      const dateString = shiftDayKey(startKey, i);

      return {
        date: dateString,
        intakes: intakeMap.get(dateString) || 0,
        outcomes: outcomeMap.get(dateString) || 0,
      };
    });

    return chartData;
  } catch (error) {
    console.error("Error fetching chart data.", error);
    throw new Error("Error fetching chart data.");
  }
};

export type TaskAnalyticsPayload = Prisma.TaskGetPayload<{
  select: {
    id: true;
    title: true;
    details: true;
    status: true;
    priority: true;
    category: true;
    dueDate: true;
    animal: { select: { id: true; name: true } };
    assignee: { select: { id: true; name: true } };
    medicationLog: {
      select: {
        id: true;
        schedule: { select: { medicationName: true } };
      };
    };
    createdBy: { select: { id: true; name: true } };
    createdAt: true;
    updatedAt: true;
  };
}>;

const _fetchAnalyticsTaskTableData = async (): Promise<
  TaskAnalyticsPayload[]
> => {
  try {
    const tasks = await prisma.task.findMany({
      
      where: {
        status: {
          in: ["TODO", "IN_PROGRESS"],
        },
      },
      
      take: 10,
      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        details: true,
        status: true,
        priority: true,
        category: true,
        dueDate: true,
        animal: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        medicationLog: {
          select: {
            id: true,
            schedule: { select: { medicationName: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching task table data.", error);
    throw new Error("Error fetching task table data.");
  }
};

type AnimalForAttentionQueryPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    healthStatus: true;
    intake: {
      select: {
        intakeDate: true;
      };
      take: 1;
    };
  };
}>;

export type AnimalsRequiringAttentionPayload = Prettify<
  Omit<AnimalForAttentionQueryPayload, "intake"> & {
    intakeDate: CalendarDay;
  }
>;





const _fetchAnimalsRequiringAttention = async (): Promise<
  AnimalsRequiringAttentionPayload[]
> => {
  try {
    const animals = await prisma.animal.findMany({
      where: {
        healthStatus: {
          not: AnimalHealthStatus.HEALTHY,
        },
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        healthStatus: true,
        intake: {
          select: {
            intakeDate: true,
          },
          
          
          orderBy: [{ intakeDate: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });

    return animals
      .filter((animal) => animal.intake.length > 0)
      .map((animal) => ({
        id: animal.id,
        name: animal.name,
        healthStatus: animal.healthStatus,
        intakeDate: calendarDay(animal.intake[0].intakeDate),
      }));
  } catch (error) {
    console.error("Error fetching animals requiring attention data.", error);
    throw new Error("Error fetching animals requiring attention data.");
  }
};

export const fetchAnalyticsTaskTableData = RequirePermission(
  AppPermissions.ANIMAL_READ_ANALYTICS,
)(_fetchAnalyticsTaskTableData);

export const fetchPetCardData = RequirePermission(
  AppPermissions.ANIMAL_READ_ANALYTICS,
)(_fetchAnimalCardData);

export const fetchChartData = RequirePermission(
  AppPermissions.ANIMAL_READ_ANALYTICS,
)(_fetchChartData);

export const fetchAnimalsRequiringAttention = RequirePermission(
  AppPermissions.ANIMAL_READ_ANALYTICS,
)(_fetchAnimalsRequiringAttention);
