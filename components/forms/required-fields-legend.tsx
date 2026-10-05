import { cn } from "@/lib/utils";


export function RequiredFieldsLegend({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Fields marked with <span className="text-destructive">*</span> are
      required.
    </p>
  );
}
