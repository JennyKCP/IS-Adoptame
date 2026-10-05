import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth";
import type { BetterAuthOptions, User } from "better-auth";
import { Prisma } from "@/prisma/generated/client";
import prisma from "@/app/lib/prisma";

type ExtendedPrismaClient = typeof prisma;













export const DEACTIVATED_ACCOUNT_CODE = "ACCOUNT_DEACTIVATED";
export const DEACTIVATED_ACCOUNT_MESSAGE =
  "This account has been deactivated. Please contact the shelter.";















function makeLinkOrCreatePerson(db: ExtendedPrismaClient, trustProvidedEmails: boolean) {
  return async function linkOrCreatePerson(
    user: User & Record<string, unknown>,
  ) {
    
    
    
    
    
    
    
    const email = user.email.toLowerCase();
    const isProviderVerified =
      user.emailVerified === true || trustProvidedEmails === true;

    if (isProviderVerified) {
      const existing = await db.person.findUnique({
        where: { email },
        include: { user: { select: { id: true } } },
      });

      if (existing && !existing.user) {
        await db.personNote.create({
          data: {
            personId: existing.id,
            content: `Auto-linked on account creation: provider-verified email (${email}) matched an existing Person with no user account.`,
          },
        });
        return { data: { personId: existing.id, emailVerified: true } };
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    try {
      const person = await db.person.create({
        data: { name: user.name, email },
      });
      return {
        data: isProviderVerified
          ? { personId: person.id, emailVerified: true }
          : { personId: person.id },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new APIError("CONFLICT", {
          code: "EMAIL_ON_ANOTHER_SHELTER_RECORD",
          message: isProviderVerified
            ? `This email address (${email}) is already recorded on a shelter record. Please contact the shelter so it can be corrected.`
            : "We could not complete your sign-up. Please contact the shelter.",
        });
      }
      throw error;
    }
  };
}

















function refuseDeactivatedAccount(db: ExtendedPrismaClient) {
  return async function refuse(session: { userId: string }) {
    const account = await db.user.findUnique({
      where: { id: session.userId },
      select: { deactivatedAt: true },
    });
    if (account?.deactivatedAt) {
      throw new APIError("FORBIDDEN", {
        code: DEACTIVATED_ACCOUNT_CODE,
        message: DEACTIVATED_ACCOUNT_MESSAGE,
      });
    }
  };
}



export const authOptions = (
  db: ExtendedPrismaClient,
  opts?: { trustProvidedEmails?: boolean },
) =>
  ({
    database: prismaAdapter(db, { provider: "postgresql" }),
    baseURL: {
      allowedHosts: process.env.BETTER_AUTH_ALLOWED_HOSTS?.split(",") ?? [],
      fallback: process.env.BETTER_AUTH_URL,
    },
    emailAndPassword: {
      
      
      
      
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    user: {
      additionalFields: {
        personId: {
          type: "string",
          input: false,
        },
        role: {
          type: ["ADMIN", "STAFF", "USER", "VOLUNTEER"],
          input: false,
        },
        
        
        deactivatedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: makeLinkOrCreatePerson(db, opts?.trustProvidedEmails ?? false),
        },
      },
      session: {
        create: {
          before: refuseDeactivatedAccount(db),
        },
      },
    },
  }) satisfies BetterAuthOptions;
