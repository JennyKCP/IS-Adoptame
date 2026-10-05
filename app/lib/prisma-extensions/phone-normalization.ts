
















import { Prisma } from "@/prisma/generated/client";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "@/app/lib/utils/phone";




function unwrapPhone(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "set" in value) {
    return unwrapPhone((value as { set: unknown }).set);
  }
  return null;
}




export function derivePhoneNormalized(data: unknown, country: CountryCode = "US"): void {
  if (!data || typeof data !== "object") return;

  
  if (Array.isArray(data)) {
    for (const row of data) derivePhoneNormalized(row, country);
    return;
  }

  
  
  
  if (!("phone" in data)) return;

  const row = data as Record<string, unknown>;
  row.phoneNormalized = normalizePhone(unwrapPhone(row.phone), country);
}

export const phoneNormalizationExtension = (readCountry: () => Promise<CountryCode>) => Prisma.defineExtension({
  name: "phone-normalization",
  query: {
    person: {
      async create({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      async createMany({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      async createManyAndReturn({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      async update({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      async updateMany({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      async updateManyAndReturn({ args, query }) {
        derivePhoneNormalized(args.data, await readCountry());
        return query(args);
      },
      
      async upsert({ args, query }) {
        const country = await readCountry();
        derivePhoneNormalized(args.create, country);
        derivePhoneNormalized(args.update, country);
        return query(args);
      },
    },
  },
});
