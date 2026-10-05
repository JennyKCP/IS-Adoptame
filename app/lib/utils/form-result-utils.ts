import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { FieldErrors } from "@/app/lib/action-result";


export function applyFieldErrors<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  fieldErrors: FieldErrors<TValues> | undefined,
): void {
  if (!fieldErrors) return;

  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;
    form.setError(key as Path<TValues>, {
      type: "server",
      message: (messages as string[]).join(", "),
    });
  }
}