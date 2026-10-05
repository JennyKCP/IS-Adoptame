import type { EffectiveApplicationStatus } from "@/app/lib/utils/derive-application-status";
import type { LucideIcon } from "lucide-react";
import {
  Hourglass,
  FileCheck2,
  List,
  UserCheck,
  UserX,
  XCircle,
  Heart,
  Archive,
} from "lucide-react";
import { buildOptions } from "@/app/lib/utils/option-utils";

const applicationStatusMeta: Record<
  EffectiveApplicationStatus,
  { label: string; icon: LucideIcon }
> = {
  PENDING: { label: "Pendiente", icon: Hourglass },
  REVIEWING: { label: "En revisión", icon: FileCheck2 },
  WAITLISTED: { label: "En lista de espera", icon: List },
  APPROVED: { label: "Aprobada", icon: UserCheck },
  REJECTED: { label: "Rechazada", icon: UserX },
  WITHDRAWN: { label: "Retirada", icon: XCircle },
  ADOPTED: { label: "Adoptada", icon: Heart },
  
  
  
  
  CLOSED: { label: "Cerrada", icon: Archive },
};

export const ApplicationStatuses = buildOptions<EffectiveApplicationStatus>(
  applicationStatusMeta,
);
