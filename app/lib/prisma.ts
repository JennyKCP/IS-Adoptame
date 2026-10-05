import { resolveShelterSettings } from "@/app/lib/utils/shelter-settings";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { resolveDatabaseUrl } from "@/app/lib/db-url";
import { phoneNormalizationExtension } from "@/app/lib/prisma-extensions/phone-normalization";
import { emailNormalizationExtension } from "@/app/lib/prisma-extensions/email-normalization";

const connectionString = resolveDatabaseUrl("pooled");

const prismaClientSingleton = () => {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  const readCountry = async () => resolveShelterSettings(
    await client.shelterSettings.findUnique({ where: { id: "shelter" } }),
  ).defaultPhoneCountry;
  return client
    .$extends(phoneNormalizationExtension(readCountry))
    .$extends(emailNormalizationExtension);
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;




export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}