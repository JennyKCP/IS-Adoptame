import { createHash } from "node:crypto";



export const MAX_SLOT = 99;

export type SlotSource = "main checkout" | "worktree path" | "E2E_SLOT";

export type HarnessCoordinates = {
  slot: number;
  slotSource: SlotSource;
  
  postgres: { user: string; password: string; database: string };
  e2e: {
    projectName: string;
    postgresPort: string;
    appPort: string;
    databaseUrl: string;
  };
  testDb: { projectName: string; postgresPort: string; databaseUrl: string };
};

export type HarnessInput = {
  
  root: string;
  
  isLinkedWorktree: boolean;
  env: Partial<Record<string, string | undefined>>;
};

export const checkoutId = (root: string) =>
  createHash("sha256").update(root).digest("hex").slice(0, 8);

const resolveSlot = ({
  root,
  isLinkedWorktree,
  env,
}: HarnessInput): Pick<HarnessCoordinates, "slot" | "slotSource"> => {
  const override = env.E2E_SLOT;
  if (override) {
    if (!/^\d+$/.test(override) || Number(override) > MAX_SLOT) {
      throw new Error(
        `E2E_SLOT must be a whole number from 0 to ${MAX_SLOT}, got "${override}".`,
      );
    }
    return { slot: Number(override), slotSource: "E2E_SLOT" };
  }

  if (!isLinkedWorktree) return { slot: 0, slotSource: "main checkout" };

  return {
    slot: 1 + (parseInt(checkoutId(root), 16) % MAX_SLOT),
    slotSource: "worktree path",
  };
};

export function resolveHarnessCoordinates(
  input: HarnessInput,
): HarnessCoordinates {
  const { env } = input;
  const { slot, slotSource } = resolveSlot(input);
  const suffix =
    input.isLinkedWorktree || slot !== 0 ? `-${checkoutId(input.root)}` : "";

  const postgres = {
    user: env.POSTGRES_USER || "postgres",
    password: env.POSTGRES_PASSWORD || "mysecretpassword",
    database: env.POSTGRES_DB || "postgres",
  };
  const databaseUrl = (port: string) => {
    const user = encodeURIComponent(postgres.user);
    const password = encodeURIComponent(postgres.password);
    const database = encodeURIComponent(postgres.database);

    return (
      env.PLAYWRIGHT_DATABASE_URL ||
      `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`
    );
  };

  const e2ePostgresPort =
    env.PLAYWRIGHT_POSTGRES_PORT || String(25400 + slot);
  const testDbPostgresPort = String(25600 + slot);

  return {
    slot,
    slotSource,
    postgres,
    e2e: {
      projectName: `adoptame-playwright${suffix}`,
      postgresPort: e2ePostgresPort,
      
      
      appPort: env.PLAYWRIGHT_APP_PORT || String(3100 + slot),
      databaseUrl: databaseUrl(e2ePostgresPort),
    },
    testDb: {
      projectName: `adoptame-db-tests${suffix}`,
      postgresPort: testDbPostgresPort,
      databaseUrl: databaseUrl(testDbPostgresPort),
    },
  };
}
