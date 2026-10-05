import type { TransactionClient } from "@/app/lib/prisma";
import { recordNoteMutation } from "@/app/lib/services/note-audit";
import { ConflictError, NotFoundError } from "@/app/lib/utils/errors";
import {
  NoteEventAction,
  NoteTargetType,
  Role,
} from "@/prisma/generated/enums";



type Actor = { userId: string; personId: string };


const writeNote = async (
  tx: TransactionClient,
  personId: string,
  actor: Actor,
  content: string,
) => {
  const created = await tx.personNote.create({
    data: { personId, content, authorId: actor.personId },
    select: { id: true },
  });
  await recordNoteMutation(tx, {
    targetType: NoteTargetType.PERSON,
    targetId: created.id,
    action: NoteEventAction.CREATED,
    actorId: actor.personId,
  });
};


const explainRefusal = async (
  tx: TransactionClient,
  userId: string,
  wanted: "deactivate" | "reactivate",
): Promise<never> => {
  const account = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!account) {
    throw new NotFoundError("User not found.");
  }
  if (wanted === "deactivate") {
    throw new ConflictError(
      account.role === Role.ADMIN
        ? "This user is an admin and cannot be deactivated here."
        : "This account is already deactivated.",
    );
  }
  throw new ConflictError("This account is not deactivated.");
};

export const deactivateAccount = async (
  tx: TransactionClient,
  userId: string,
  actor: Actor,
  note: { reason: string },
): Promise<{ personId: string }> => {
  
  
  
  if (userId === actor.userId) {
    throw new ConflictError("You cannot deactivate your own account.");
  }

  
  
  
  
  
  
  const { count } = await tx.user.updateMany({
    where: { id: userId, deactivatedAt: null, NOT: { role: Role.ADMIN } },
    data: { deactivatedAt: new Date() },
  });
  if (count === 0) {
    return explainRefusal(tx, userId, "deactivate");
  }

  
  
  await tx.session.deleteMany({ where: { userId } });

  const account = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { personId: true, email: true },
  });
  await writeNote(
    tx,
    account.personId,
    actor,
    `Login account (${account.email}) deactivated. It cannot sign in and its existing sessions were ended; this record, its applications and its history are unchanged. Reason: ${note.reason}`,
  );
  return { personId: account.personId };
};

export const reactivateAccount = async (
  tx: TransactionClient,
  userId: string,
  actor: Actor,
  note: { reason: string | null },
): Promise<{ personId: string }> => {
  
  
  
  const { count } = await tx.user.updateMany({
    where: { id: userId, deactivatedAt: { not: null } },
    data: { deactivatedAt: null },
  });
  if (count === 0) {
    return explainRefusal(tx, userId, "reactivate");
  }

  const account = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { personId: true, email: true },
  });
  await writeNote(
    tx,
    account.personId,
    actor,
    note.reason
      ? `Login account (${account.email}) reactivated. It can sign in again. Reason: ${note.reason}`
      : `Login account (${account.email}) reactivated. It can sign in again.`,
  );
  return { personId: account.personId };
};
