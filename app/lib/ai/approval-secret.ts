import { AiProviderConfigError } from "./provider-guard";


export function getToolApprovalSecret(): string {
  const secret = process.env.AI_TOOL_APPROVAL_SECRET?.trim();
  if (!secret) {
    throw new AiProviderConfigError(
      "AI_TOOL_APPROVAL_SECRET is not set. Write tools sign their approval " +
        "requests so a client cannot forge one; refusing to run a write tool " +
        "with unsigned approvals. Set AI_TOOL_APPROVAL_SECRET to a random " +
        "secret (openssl rand -base64 32).",
    );
  }
  return secret;
}
