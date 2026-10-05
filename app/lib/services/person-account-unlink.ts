import type { TransactionClient } from "@/app/lib/prisma";
import { recordNoteMutation } from "@/app/lib/services/note-audit";
import { ConflictError, NotFoundError } from "@/app/lib/utils/errors";
import { NoteEventAction, NoteTargetType } from "@/prisma/generated/enums";



export interface UnlinkedAccount {
  
  replacementPersonId: string;
  
  addressFollowedAccount: boolean;
}

export const unlinkAccountFromPerson = async (
  tx: TransactionClient,
  personId: string,
  actor: { userId: string; personId: string },
): Promise<UnlinkedAccount> => {
  
  
  
  
  
  await tx.$queryRaw`SELECT id FROM persons WHERE id = ${personId} FOR UPDATE`;

  const person = await tx.person.findUnique({
    where: { id: personId },
    select: {
      name: true,
      email: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!person) {
    throw new NotFoundError("Person not found.");
  }
  if (!person.user) {
    throw new ConflictError(
      "This person has no login account, so there is nothing to unlink.",
    );
  }
  
  
  
  if (person.user.id === actor.userId) {
    throw new ConflictError(
      "You cannot unlink your own account from your own record.",
    );
  }

  const account = person.user;

  
  
  
  
  
  
  
  
  
  const addressFollowedAccount = person.email === account.email;
  if (addressFollowedAccount) {
    await tx.person.update({
      where: { id: personId },
      data: { email: null },
    });
  }

  
  
  
  
  
  
  const heldElsewhere = await tx.person.findFirst({
    where: { email: account.email },
    select: { id: true },
  });

  
  
  
  
  
  const replacement = await tx.person.create({
    data: {
      
      
      
      
      name: account.name,
      email: heldElsewhere ? null : account.email,
    },
    select: { id: true },
  });

  await tx.user.update({
    where: { id: account.id },
    data: { personId: replacement.id },
  });

  const addressNote = addressFollowedAccount
    ? " The email held here was that account's sign-in address, so it left with the account; set this person's own address if you know it."
    : "";
  
  
  
  
  
  
  
  const replacementAddressNote = heldElsewhere
    ? " The account's sign-in address is already on another person record, so this one starts with no email. Staff cannot set it — the account holder can add it from their own profile."
    : "";

  
  
  
  
  const notes = [
    {
      personId,
      content: `Login account (${account.email}) unlinked from this record and moved to a new person record for "${account.name}". Applications, notes and history stay here, and this record is staff-editable again.${addressNote}`,
    },
    {
      personId: replacement.id,
      content: `Created by unlinking a login account (${account.email}) from the record of "${person.name}", which it had been linked to in error. This record starts empty — the applications, notes and history stay on the record they were about. The name here is the one on the account and may need correcting.${replacementAddressNote}`,
    },
  ];
  for (const note of notes) {
    const created = await tx.personNote.create({
      data: { ...note, authorId: actor.personId },
      select: { id: true },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PERSON,
      targetId: created.id,
      action: NoteEventAction.CREATED,
      actorId: actor.personId,
    });
  }

  return { replacementPersonId: replacement.id, addressFollowedAccount };
};
