import type { FosterStatus } from "@/prisma/generated/enums";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { buildOptions } from "@/app/lib/utils/option-utils";

const fosterStatusMeta: Record<FosterStatus, { label: string; icon: LucideIcon }> = {
  ACTIVE: { label: "Activa", icon: CheckCircle2 },
  PAUSED: { label: "Pausada", icon: PauseCircle },
  INACTIVE: { label: "Inactiva", icon: XCircle },
};

export const FosterStatuses = buildOptions<FosterStatus>(fosterStatusMeta);




export const FosterCapacityOptions = [{ value: "available", label: "Tiene capacidad" }];
