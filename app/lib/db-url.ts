
export type DatabaseUrlMode = "pooled" | "direct";

export function resolveDatabaseUrl(
  mode: DatabaseUrlMode,
  env: Partial<Record<string, string | undefined>> = process.env,
): string {
  
  if (env.PLAYWRIGHT_DATABASE_URL) return env.PLAYWRIGHT_DATABASE_URL;

  if (mode === "pooled") {
    const url = env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Missing database URL (mode: pooled). Set PLAYWRIGHT_DATABASE_URL or DATABASE_URL.",
      );
    }
    return url;
  }

  const url = env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "Missing database URL (mode: direct). direct mode requires DATABASE_URL_UNPOOLED " +
        "(migrations and seeding need an unpooled connection); set it to the same value " +
        "as DATABASE_URL for local Postgres.",
    );
  }
  return url;
}


export function isLocalDatabaseUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host) return false;

  
  
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host === "::1") return true;
  if (host === "localhost" || host === "0.0.0.0") return true;
  if (host.endsWith(".local")) return true;

  
  
  
  if (!host.includes(".") && !host.includes(":")) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const first = Number(ipv4[1]);
    const second = Number(ipv4[2]);
    if (first === 127 || first === 10) return true;
    if (first === 192 && second === 168) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
  }

  return false;
}
