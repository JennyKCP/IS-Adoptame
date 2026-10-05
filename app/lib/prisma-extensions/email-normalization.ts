




















import { Prisma } from "@/prisma/generated/client";





function lowercaseEmailValue(value: unknown): unknown {
  if (typeof value === "string") return value.toLowerCase();
  if (value && typeof value === "object" && "set" in value) {
    const wrapper = value as { set: unknown };
    return { ...wrapper, set: lowercaseEmailValue(wrapper.set) };
  }
  return value;
}




export function lowercaseEmail(data: unknown): void {
  if (!data || typeof data !== "object") return;

  
  if (Array.isArray(data)) {
    for (const row of data) lowercaseEmail(row);
    return;
  }

  
  
  if (!("email" in data)) return;

  const row = data as Record<string, unknown>;
  row.email = lowercaseEmailValue(row.email);
}

type Query = (args: never) => Promise<unknown>;
type WriteArgs = { args: { data: unknown }; query: Query };



const lowercaseOnWrite = {
  create({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  createMany({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  createManyAndReturn({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  update({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  updateMany({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  updateManyAndReturn({ args, query }: WriteArgs) {
    lowercaseEmail(args.data);
    return query(args as never);
  },
  
  upsert({
    args,
    query,
  }: {
    args: { create: unknown; update: unknown };
    query: Query;
  }) {
    lowercaseEmail(args.create);
    lowercaseEmail(args.update);
    return query(args as never);
  },
};

export const emailNormalizationExtension = Prisma.defineExtension({
  name: "email-normalization",
  query: {
    person: lowercaseOnWrite,
    user: lowercaseOnWrite,
  },
});
