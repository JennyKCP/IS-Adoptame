import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import {
  checkoutId,
  resolveHarnessCoordinates,
} from "../app/lib/test-harness-coordinates";

const envFiles = [
  ".env",
  ".env.development",
  ".env.local",
  ".env.development.local",
];

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true, quiet: true });
  }
}





process.env.BETTER_AUTH_SECRET ||=
  "e2e-test-only-secret-never-used-outside-tests";
process.env.ADMIN_PASSWORD ||= "e2e-admin-password";


const coordinates = resolveHarnessCoordinates({
  root: process.cwd(),
  isLinkedWorktree:
    fs.statSync(path.join(process.cwd(), ".git"), { throwIfNoEntry: false })
      ?.isFile() ?? false,
  env: process.env,
});

export const HARNESS_SLOT = coordinates.slot;
export const HARNESS_SLOT_SOURCE = coordinates.slotSource;


export const HARNESS_CHECKOUT_ID = checkoutId(process.cwd());

export const E2E_APP_PORT = coordinates.e2e.appPort;
export const E2E_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${E2E_APP_PORT}`;
export const E2E_POSTGRES_SERVICE_NAME = "postgres-e2e";
export const E2E_DOCKER_PROJECT_NAME = coordinates.e2e.projectName;
export const E2E_DOCKER_COMPOSE_FILE = path.join(
  process.cwd(),
  "docker-compose.playwright.yml",
);
export const E2E_POSTGRES_PORT = coordinates.e2e.postgresPort;
export const E2E_POSTGRES_USER = coordinates.postgres.user;
export const E2E_POSTGRES_PASSWORD = coordinates.postgres.password;
export const E2E_POSTGRES_DB = coordinates.postgres.database;




export const E2E_NEXT_DIST_DIR = ".next-e2e";

export const E2E_DATABASE_URL = coordinates.e2e.databaseUrl;



export const TEST_DB_DOCKER_PROJECT_NAME = coordinates.testDb.projectName;
export const TEST_DB_POSTGRES_PORT = coordinates.testDb.postgresPort;
export const TEST_DB_DATABASE_URL = coordinates.testDb.databaseUrl;


export const describeHarness = (
  projectName: string,
  databaseUrl: string,
  appUrl?: string,
) => {
  let database = databaseUrl;
  try {
    database = new URL(databaseUrl).host;
  } catch {
    
  }
  return [
    `slot ${HARNESS_SLOT} (${HARNESS_SLOT_SOURCE})`,
    `compose project ${projectName}`,
    `Postgres ${database}`,
    ...(appUrl ? [`app ${appUrl}`] : []),
  ].join(", ");
};






export const E2E_ALLOWED_HOSTS = (() => {
  let host = `127.0.0.1:${E2E_APP_PORT}`;
  try {
    host = new URL(E2E_BASE_URL).host;
  } catch {
    
  }
  return [host, "127.0.0.1:*", "localhost:*"].join(",");
})();

export const getPlaywrightEnv = (): NodeJS.ProcessEnv => {
  return {
    ...process.env,
    DATABASE_URL: E2E_DATABASE_URL,
    DATABASE_URL_UNPOOLED: E2E_DATABASE_URL,
    PLAYWRIGHT_DATABASE_URL: E2E_DATABASE_URL,
    BETTER_AUTH_URL: E2E_BASE_URL,
    BETTER_AUTH_ALLOWED_HOSTS: E2E_ALLOWED_HOSTS,
    
    
    
    
    GITHUB_CLIENT_ID: "e2e-placeholder-client-id",
    GITHUB_CLIENT_SECRET: "e2e-placeholder-client-secret",
    GOOGLE_CLIENT_ID: "e2e-placeholder-client-id",
    GOOGLE_CLIENT_SECRET: "e2e-placeholder-client-secret",
    HOSTNAME: "127.0.0.1",
    PORT: E2E_APP_PORT,
    POSTGRES_HOST: "127.0.0.1",
    POSTGRES_PORT: E2E_POSTGRES_PORT,
    POSTGRES_USER: E2E_POSTGRES_USER,
    POSTGRES_PASSWORD: E2E_POSTGRES_PASSWORD,
    POSTGRES_DB: E2E_POSTGRES_DB,
    PLAYWRIGHT_POSTGRES_USER: E2E_POSTGRES_USER,
    PLAYWRIGHT_POSTGRES_PASSWORD: E2E_POSTGRES_PASSWORD,
    PLAYWRIGHT_POSTGRES_DB: E2E_POSTGRES_DB,
    PLAYWRIGHT_POSTGRES_PORT: E2E_POSTGRES_PORT,
    COMPOSE_PROJECT_NAME: E2E_DOCKER_PROJECT_NAME,
    PLAYWRIGHT_NEXT_DIST_DIR: E2E_NEXT_DIST_DIR,
    
    PLAYWRIGHT_UNOPTIMIZED_IMAGES: "1",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ?? "",
    NEXT_TELEMETRY_DISABLED: "1",
  };
};

