import { tool } from "ai";
import type { ModelMessage, ToolApprovalStatus } from "ai";
import { z } from "zod";
import { Prisma } from "@/prisma/generated/client";
import prisma from "@/app/lib/prisma";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { requireFor, type Actor } from "@/app/lib/auth/actor";
import { AiActionTargetType, TaskStatus } from "@/prisma/generated/enums";
import { applyTaskStatusChange } from "@/app/lib/tasks/apply-task-status-change";
import { ConflictError, PreconditionFailedError } from "@/app/lib/utils/errors";
import { actorContextSchema } from "../context";
import {
  buildApprovalReason,
  formatUnitLabel,
} from "./set-task-status-reason";
import {
  describeToolError,
  toolFailure,
  type ToolResult,
} from "./tool-result";

export { buildApprovalReason } from "./set-task-status-reason";


export const SET_TASK_STATUS_PERMISSIONS = [AppPermissions.ANIMAL_TASK_MANAGE];






const setTaskStatusInput = z.object({
  taskId: z
    .string()
    .describe(
      "The task id from getAnimalSummary's openTasks. Never a task title or " +
        "an animal name — resolve the animal with findAnimals, read its tasks " +
        "with getAnimalSummary, then pass the openTasks[].taskId here.",
    ),
  status: z
    .enum(TaskStatus)
    .describe("The new status. Usually DONE. Also SKIPPED, IN_PROGRESS, TODO."),
});

export type SetTaskStatusInput = z.infer<typeof setTaskStatusInput>;

export type SetTaskStatusOk = {
  taskId: string;
  title: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  
  changed: boolean;
};


function findApprovalId(
  messages: ModelMessage[],
  toolCallId: string,
): string | null {
  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "tool-approval-request" &&
        "toolCallId" in part &&
        part.toolCallId === toolCallId &&
        "approvalId" in part &&
        typeof part.approvalId === "string"
      ) {
        return part.approvalId;
      }
    }
  }
  return null;
}


export async function setTaskStatusApproval(
  input: SetTaskStatusInput,
  _options: {
    toolCallId: string;
    messages: ModelMessage[];
    toolContext: Actor;
    runtimeContext: unknown;
  },
): Promise<ToolApprovalStatus> {
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      title: true,
      status: true,
      animal: {
        select: {
          name: true,
          currentUnit: {
            select: { name: true, location: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!task) {
    return {
      type: "denied",
      reason:
        "No task exists with that id, so nothing was changed. Ask the user " +
        "to name the animal, look up its tasks, and try again.",
    };
  }

  if (task.status === input.status) {
    return {
      type: "denied",
      reason: `Task "${task.title}" on ${task.animal.name} is already ${input.status}. No change needed.`,
    };
  }

  return {
    type: "user-approval",
    reason: buildApprovalReason({
      taskTitle: task.title,
      animalName: task.animal.name,
      unitLabel: formatUnitLabel(task.animal.currentUnit),
      currentStatus: task.status,
      requestedStatus: input.status,
    }),
  };
}


export async function writeTaskStatus(
  actor: Actor,
  params: {
    input: SetTaskStatusInput;
    toolCallId: string;
    approvalId: string;
  },
): Promise<SetTaskStatusOk> {
  const { input, toolCallId, approvalId } = params;

  try {
    return await prisma.$transaction(async (tx) => {
      const result = await applyTaskStatusChange(tx, {
        taskId: input.taskId,
        status: input.status,
        changedById: actor.personId,
      });

      
      
      
      if (result.changed) {
        await tx.aiActionLog.create({
          data: {
            toolName: "setTaskStatus",
            toolCallId,
            approvalId,
            targetType: AiActionTargetType.TASK,
            targetId: input.taskId,
            input,
            before: { status: result.previousStatus },
            after: { status: input.status },
            actorId: actor.personId,
          },
        });
      }

      return {
        taskId: input.taskId,
        title: result.title,
        previousStatus: result.previousStatus,
        newStatus: input.status,
        changed: result.changed,
      };
    });
  } catch (error) {
    
    
    
    
    
    
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "This approval has already been used, so nothing was changed.",
      );
    }
    throw error;
  }
}

export const setTaskStatusTool = tool({
  description:
    "Change one task's status (for example, mark it DONE). Staff action. The " +
    "user is shown a confirmation card with the task's real title, animal, " +
    "and current status, and must approve before anything is written — so do " +
    "not tell the user the task is done until this tool returns a result. " +
    "Takes a task id (from getAnimalSummary's openTasks) and the new status; " +
    "never a task title or animal name. Change one task per call. If the id " +
    "is wrong or the task is already in that status the approval is declined " +
    "with a reason — relay it, do not retry blindly.",
  inputSchema: setTaskStatusInput,
  contextSchema: actorContextSchema,
  async execute(
    input,
    { context, toolCallId, messages },
  ): Promise<ToolResult<{ result: SetTaskStatusOk }>> {
    try {
      for (const permission of SET_TASK_STATUS_PERMISSIONS) {
        requireFor(context, permission);
      }
      const approvalId = findApprovalId(messages, toolCallId);
      if (approvalId === null) {
        
        
        
        
        
        throw new PreconditionFailedError(
          "No approval was found for this action, so nothing was changed.",
        );
      }
      const result = await writeTaskStatus(context, {
        input,
        toolCallId,
        approvalId,
      });
      return { ok: true, result };
    } catch (error) {
      return toolFailure(describeToolError(error));
    }
  },
});
