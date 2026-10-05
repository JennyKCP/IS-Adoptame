
export const CHAT_ERROR_COPY = {
  busy: "The assistant is busy right now. Wait a moment and try again.",
  misconfigured:
    "The assistant is not configured correctly. Contact an administrator.",
  signedOut: "Your session has expired. Refresh the page and sign in again.",
  offline: "Couldn't reach the assistant. Check your connection and try again.",
  unknown: "Something went wrong while answering. Try again.",
} as const;

export type ChatErrorKind = keyof typeof CHAT_ERROR_COPY;

const AUTHORED_MESSAGES = new Set<string>(Object.values(CHAT_ERROR_COPY));


export function classifyChatError(rawMessage: string): ChatErrorKind {
  if (
    /\b(429|503|500|overloaded|unavailable|high demand|rate limit|quota|exhausted)\b/i.test(
      rawMessage,
    )
  ) {
    return "busy";
  }
  if (/\b(api[_ -]?key|permission denied|unauthenticated|invalid credential)\b/i.test(rawMessage)) {
    return "misconfigured";
  }
  return "unknown";
}


export function describeChatError(error: Error | undefined): string {
  if (!error) return CHAT_ERROR_COPY.unknown;

  if (AUTHORED_MESSAGES.has(error.message)) return error.message;

  const raw = error.message;
  if (/\b(401|unauthorized|forbidden|403)\b/i.test(raw)) {
    return CHAT_ERROR_COPY.signedOut;
  }
  if (/failed to fetch|networkerror|load failed|err_internet/i.test(raw)) {
    return CHAT_ERROR_COPY.offline;
  }
  return CHAT_ERROR_COPY.unknown;
}
