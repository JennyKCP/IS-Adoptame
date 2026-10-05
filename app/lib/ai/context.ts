import { z } from "zod";
import type { Actor } from "@/app/lib/auth/actor";


export const actorContextSchema: z.ZodType<Actor> = z.object({
  userId: z.string(),
  personId: z.string(),
  role: z.string(),
});
