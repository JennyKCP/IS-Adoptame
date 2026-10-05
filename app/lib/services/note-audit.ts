import type { TransactionClient } from "@/app/lib/prisma";
import {
  AnimalActivityType,
  NoteEventAction,
  NoteTargetType,
} from "@/prisma/generated/enums";



const ACTIVITY_TYPE_BY_ACTION: Record<NoteEventAction, AnimalActivityType> = {
  [NoteEventAction.CREATED]: AnimalActivityType.NOTE_ADDED,
  [NoteEventAction.EDITED]: AnimalActivityType.NOTE_EDITED,
  [NoteEventAction.DELETED]: AnimalActivityType.NOTE_DELETED,
  [NoteEventAction.RESTORED]: AnimalActivityType.NOTE_RESTORED,
};

export interface RecordNoteMutationParams {
  targetType: NoteTargetType;
  
  targetId: string;
  action: NoteEventAction;
  
  actorId: string;
  
  animalId?: string;
  
  categoryLabel?: string;
}

export async function recordNoteMutation(
  tx: TransactionClient,
  params: RecordNoteMutationParams,
): Promise<void> {
  const { targetType, targetId, action, actorId, animalId, categoryLabel } =
    params;

  await tx.noteEvent.create({
    data: { targetType, targetId, action, actorId },
  });

  if (targetType !== NoteTargetType.ANIMAL) return;

  if (!animalId) {
    throw new Error(
      "recordNoteMutation: animalId is required for ANIMAL note events.",
    );
  }

  await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: ACTIVITY_TYPE_BY_ACTION[action],
      changedById: actorId,
      changeSummary: categoryLabel ?? null,
    },
  });
}


export function isNoteEditNoOp(
  current: { content: string; category?: string | null },
  next: { content: string; category?: string | null },
): boolean {
  return (
    current.content === next.content &&
    (current.category ?? null) === (next.category ?? null)
  );
}


export const NO_OP_EDIT_MESSAGE = "No changes to save.";
