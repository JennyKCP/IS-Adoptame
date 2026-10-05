








export const safeInternalPath = (
  candidate: string | null | undefined,
  fallback: string,
): string =>
  candidate &&
  candidate.startsWith("/") &&
  !candidate.startsWith("//") &&
  !candidate.startsWith("/\\")
    ? candidate
    : fallback;