import { groq } from "@ai-sdk/groq";
import { resolveDatabaseUrl } from "@/app/lib/db-url";
import {
  assertAiProviderAllowed,
  parseAiProviderTier,
} from "./provider-guard";



export const MODEL_ID = "openai/gpt-oss-120b";


export const MAX_STEPS = 5;




assertAiProviderAllowed({
  tier: parseAiProviderTier(process.env.AI_PROVIDER_TIER),
  databaseUrl: resolveDatabaseUrl("pooled"),
});

export const model = groq(MODEL_ID);
