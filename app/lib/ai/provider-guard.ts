import { isLocalDatabaseUrl } from "@/app/lib/db-url";



export type AiProviderTier = "free" | "paid" | "free-synthetic";

export class AiProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderConfigError";
  }
}

export function parseAiProviderTier(raw: string | undefined): AiProviderTier {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value === "") return "free";
  if (value === "free" || value === "paid" || value === "free-synthetic") {
    return value;
  }
  throw new AiProviderConfigError(
    `AI_PROVIDER_TIER must be "free", "paid", or "free-synthetic" (got "${raw}").`,
  );
}


export function assertAiProviderAllowed(input: {
  tier: AiProviderTier;
  databaseUrl: string;
}): void {
  if (input.tier === "paid") return;
  if (input.tier === "free-synthetic") return;
  if (isLocalDatabaseUrl(input.databaseUrl)) return;

  throw new AiProviderConfigError(
    "Refusing to initialise the AI provider: AI_PROVIDER_TIER is not \"paid\" and " +
      "DATABASE_URL does not point at a local/private database. Free-tier model " +
      "providers retain prompts and tool results for training and human review, " +
      "which is only acceptable against the synthetic demo database. Set " +
      "AI_PROVIDER_TIER=paid (with a paid API key) to use a networked database.",
  );
}
