import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./app/lib/db-url";










dotenv.config({ path: [".env.local", ".env.development", ".env"], quiet: true });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveDatabaseUrl("direct"),
  },
});
