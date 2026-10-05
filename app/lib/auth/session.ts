import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";















export const getCachedSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.deactivatedAt) return null;
  return session;
});
