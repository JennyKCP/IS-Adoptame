import { Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


export function ReversedOutcomeBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-destructive/40 text-destructive dark:border-destructive/60",
        className,
      )}
    >
      <Undo2 />
      Reversed
    </Badge>
  );
}
