import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { AiActionTargetType, type TaskStatus } from "@/prisma/generated/enums";
import { z } from "zod";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../auth/protected-actions";
import { pageSizeSchema } from "../zod-schemas/common.schemas";
import { parseSnapshot } from "./ai-activity";






const AiActivityLogParamsSchema = z.object({
  currentPage: z.int().positive(),
  pageSize: pageSizeSchema,
  sort: z.string().optional(),
  
  state: z.string().optional(),
  
  actor: z.string().optional(),
});


export type AiActivityLogRow = {
  id: string;
  toolName: string;
  createdAt: Date;
  undoneAt: Date | null;
  actorId: string;
  actorName: string;
  targetType: AiActionTargetType;
  targetId: string;
  
  taskChange: { before: TaskStatus; after: TaskStatus } | null;
  
  target: {
    taskId: string;
    title: string;
    animalId: string;
    animalName: string;
  } | null;
};

const _fetchAiActivityLog = async (
  currentPageInput: number,
  pageSizeInput: number,
  sortInput: string | undefined,
  stateInput: string | undefined,
  actorInput: string | undefined,
): Promise<{
  rows: AiActivityLogRow[];
  totalPages: number;
  totalRows: number;
}> => {
  const validatedArgs = AiActivityLogParamsSchema.safeParse({
    currentPage: currentPageInput,
    pageSize: pageSizeInput,
    sort: sortInput,
    state: stateInput,
    actor: actorInput,
  });

  if (!validatedArgs.success) {
    throw new Error("Invalid arguments for fetching AI activity.");
  }

  const { currentPage, pageSize, sort, state, actor } = validatedArgs.data;

  
  
  const orderBy: Prisma.AiActionLogOrderByWithRelationInput = (() => {
    if (!sort) return { createdAt: "desc" };
    const [id, dir] = sort.split(".");
    const direction: "asc" | "desc" = dir === "asc" ? "asc" : "desc";

    if (id === "actor") return { actor: { name: direction } };
    if (["createdAt", "toolName", "undoneAt"].includes(id)) {
      return { [id]: direction };
    }
    return { createdAt: "desc" };
  })();

  const whereClause: Prisma.AiActionLogWhereInput = {};

  const states = state?.split(",").filter(Boolean) ?? [];
  
  
  
  if (states.length === 1) {
    whereClause.undoneAt = states[0] === "undone" ? { not: null } : null;
  }

  const actorIds = actor?.split(",").filter(Boolean) ?? [];
  if (actorIds.length > 0) {
    whereClause.actorId = { in: actorIds };
  }

  try {
    const offset = (currentPage - 1) * pageSize;
    const [totalRows, logs] = await Promise.all([
      prisma.aiActionLog.count({ where: whereClause }),
      prisma.aiActionLog.findMany({
        where: whereClause,
        select: {
          id: true,
          toolName: true,
          createdAt: true,
          undoneAt: true,
          targetType: true,
          targetId: true,
          before: true,
          after: true,
          actor: { select: { id: true, name: true } },
        },
        orderBy,
        take: pageSize,
        skip: offset,
      }),
    ]);

    
    
    
    const taskIds = logs
      .filter((log) => log.targetType === AiActionTargetType.TASK)
      .map((log) => log.targetId);

    const tasks = taskIds.length
      ? await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: {
            id: true,
            title: true,
            animal: { select: { id: true, name: true } },
          },
        })
      : [];
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const rows: AiActivityLogRow[] = logs.map((log) => {
      const before = parseSnapshot(log.targetType, log.before);
      const after = parseSnapshot(log.targetType, log.after);
      const taskChange =
        before.success && after.success
          ? { before: before.data.status, after: after.data.status }
          : null;

      const task =
        log.targetType === AiActionTargetType.TASK
          ? taskById.get(log.targetId)
          : undefined;

      return {
        id: log.id,
        toolName: log.toolName,
        createdAt: log.createdAt,
        undoneAt: log.undoneAt,
        actorId: log.actor.id,
        actorName: log.actor.name,
        targetType: log.targetType,
        targetId: log.targetId,
        taskChange,
        target: task
          ? {
              taskId: task.id,
              title: task.title,
              animalId: task.animal.id,
              animalName: task.animal.name,
            }
          : null,
      };
    });

    return {
      rows,
      totalPages: Math.ceil(totalRows / pageSize),
      totalRows,
    };
  } catch (error) {
    console.error("Error fetching AI activity log:", error);
    throw new Error("Error fetching AI activity log.");
  }
};


const _fetchAiActivityActors = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    const rows = await prisma.aiActionLog.findMany({
      distinct: ["actorId"],
      select: { actor: { select: { id: true, name: true } } },
    });
    return rows
      .map((row) => row.actor)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching AI activity actors:", error);
    throw new Error("Error fetching AI activity actors.");
  }
};

export const fetchAiActivityLog = RequirePermission(
  AppPermissions.AI_ACTIVITY_READ,
)(_fetchAiActivityLog);

export const fetchAiActivityActors = RequirePermission(
  AppPermissions.AI_ACTIVITY_READ,
)(_fetchAiActivityActors);
