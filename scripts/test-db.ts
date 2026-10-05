
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  describeHarness,
  E2E_DOCKER_COMPOSE_FILE,
  E2E_POSTGRES_DB,
  E2E_POSTGRES_PASSWORD,
  E2E_POSTGRES_USER,
  TEST_DB_DATABASE_URL,
  TEST_DB_DOCKER_PROJECT_NAME,
  TEST_DB_POSTGRES_PORT,
} from "@/playwright/env";

const env: NodeJS.ProcessEnv = {
  ...process.env,
  PLAYWRIGHT_DATABASE_URL: TEST_DB_DATABASE_URL,
  
  
  DATABASE_URL: TEST_DB_DATABASE_URL,
  DATABASE_URL_UNPOOLED: TEST_DB_DATABASE_URL,
  
  PLAYWRIGHT_POSTGRES_PORT: TEST_DB_POSTGRES_PORT,
  PLAYWRIGHT_POSTGRES_USER: E2E_POSTGRES_USER,
  PLAYWRIGHT_POSTGRES_PASSWORD: E2E_POSTGRES_PASSWORD,
  PLAYWRIGHT_POSTGRES_DB: E2E_POSTGRES_DB,
};




const passThrough = [
  "PATH",
  "HOME",
  "USER",
  "TMPDIR",
  "LANG",
  "TERM",
  "VOLTA_HOME",
];
const testEnv: Record<string, string | undefined> = {
  PLAYWRIGHT_DATABASE_URL: TEST_DB_DATABASE_URL,
};
for (const name of passThrough) {
  if (process.env[name] !== undefined) testEnv[name] = process.env[name];
}

const fileArgs = process.argv.slice(2);
const refused = fileArgs.filter(
  (arg) =>
    arg.startsWith("-") ||
    !/^[\w./ -]+$/.test(arg) ||
    !fs.statSync(arg, { throwIfNoEntry: false })?.isFile(),
);
if (refused.length > 0) {
  for (const arg of refused) {
    console.error(`test:db: not a plain path to an existing file: ${arg}`);
  }
  console.error(
    "Name test files by path, e.g. npm run test:db -- prisma/outcome-reversal.test.ts",
  );
  process.exit(1);
}

const run = (
  command: string,
  args: string[],
  childEnv: NodeJS.ProcessEnv,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: childEnv,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} → ${signal ?? `exit ${code}`}`,
        ),
      );
    });
  });

async function main() {
  console.log(
    `test:db harness: ${describeHarness(TEST_DB_DOCKER_PROJECT_NAME, TEST_DB_DATABASE_URL)}`,
  );
  await run(
    "docker",
    [
      "compose",
      "-p",
      TEST_DB_DOCKER_PROJECT_NAME,
      "-f",
      E2E_DOCKER_COMPOSE_FILE,
      "up",
      "-d",
      "--wait",
    ],
    env,
  );
  await run("npx", ["prisma", "db", "push"], env);
  await run(
    process.execPath,
    [
      
      
      createRequire(path.join(process.cwd(), "package.json")).resolve(
        "tsx/cli",
      ),
      "--test",
      ...(fileArgs.length > 0 ? fileArgs : ["prisma/**/*.test.ts"]),
    ],
    
    testEnv as NodeJS.ProcessEnv,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
