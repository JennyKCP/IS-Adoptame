import { buildOptions } from "@/app/lib/utils/option-utils";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, RotateCcw } from "lucide-react";




const stateMeta: Record<"active" | "undone", { label: string; icon: LucideIcon }> = {
  active: { label: "Activo", icon: CheckCircle2 },
  undone: { label: "Deshecho", icon: RotateCcw },
};

export const aiActivityStates = buildOptions(stateMeta);
