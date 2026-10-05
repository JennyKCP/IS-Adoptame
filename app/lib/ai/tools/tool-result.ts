import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
} from "@/app/lib/utils/errors";


export type ToolFailure = { ok: false; reason: string };
export type ToolSuccess<T> = { ok: true } & T;
export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export function toolFailure(reason: string): ToolFailure {
  return { ok: false, reason };
}


export function describeToolError(error: unknown): string {
  if (error instanceof ForbiddenError) {
    return "You do not have permission to use this tool.";
  }
  if (error instanceof NotFoundError) {
    return "The requested record could not be found.";
  }
  if (error instanceof PreconditionFailedError) {
    return error.message;
  }
  if (error instanceof ConflictError) {
    return error.message;
  }
  console.error("Unexpected error inside an AI tool.", error);
  return "Something went wrong while running this tool. Try again or rephrase the request.";
}
