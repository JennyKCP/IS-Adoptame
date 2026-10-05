import type { TransactionClient } from "@/app/lib/prisma";



export interface PersonContact {
  name: string;
  
  email?: string | null;
}


export type EmailConflict = "person" | "user";


export const findEmailConflict = async (
  client: Pick<TransactionClient, "person" | "user">,
  email: string | null | undefined,
  personId: string,
): Promise<EmailConflict | null> => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const person = await client.person.findFirst({
    where: { email: normalized, id: { not: personId } },
    select: { id: true },
  });
  if (person) return "person";

  const account = await client.user.findFirst({
    where: { email: normalized, personId: { not: personId } },
    select: { id: true },
  });
  return account ? "user" : null;
};

export const syncPersonToUser = async (
  
  client: Pick<TransactionClient, "user">,
  personId: string,
  contact: PersonContact,
): Promise<void> => {
  
  
  const account = await client.user.findUnique({
    where: { personId },
    select: { id: true, email: true },
  });
  if (!account) return;

  
  
  
  const email = contact.email ? contact.email.trim().toLowerCase() : null;
  const isNewAddress = email !== null && email !== account.email;

  await client.user.update({
    where: { id: account.id },
    data: {
      name: contact.name,
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      ...(isNewAddress ? { email, emailVerified: false } : {}),
    },
  });
};
