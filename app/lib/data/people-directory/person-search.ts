

import { Role } from "@/prisma/generated/enums";
import type { Prisma } from "@/prisma/generated/client";
import { normalizePhoneQuery } from "../../utils/phone";






export const nonAdminPersonFilter: Prisma.PersonWhereInput = {
  OR: [{ user: null }, { user: { role: { not: Role.ADMIN } } }],
};



export const personSearchWhereClause = (query: string): Prisma.PersonWhereInput => {
  
  
  
  
  
  
  const digitsOnly = /^[\d\s()+.-]+$/.test(query.trim())
    ? normalizePhoneQuery(query)
    : "";
  const digitsQuery = digitsOnly.length >= 4 ? digitsOnly : "";

  return {
    AND: [
      nonAdminPersonFilter,
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          ...(digitsQuery
            ? [{ phoneNormalized: { contains: digitsQuery } }]
            : []),
        ],
      },
    ],
  };
};
