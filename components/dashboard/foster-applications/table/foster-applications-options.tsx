import type { ApplicationStatus } from "@/prisma/generated/enums";
import type { LucideIcon } from "lucide-react";
import { Hourglass, FileCheck2, List, UserCheck, UserX, XCircle } from "lucide-react";
import { buildOptions } from "@/app/lib/utils/option-utils";

const fosterApplicationStatusMeta: Record<
  ApplicationStatus,
  { label: string; icon: LucideIcon }
> = {
  PENDING: { label: "Pendiente", icon: Hourglass },
  REVIEWING: { label: "En revisión", icon: FileCheck2 },
  WAITLISTED: { label: "En lista de espera", icon: List },
  APPROVED: { label: "Aprobada", icon: UserCheck },
  REJECTED: { label: "Rechazada", icon: UserX },
  WITHDRAWN: { label: "Retirada", icon: XCircle },
};

export const FosterApplicationStatuses = buildOptions<ApplicationStatus>(
  fosterApplicationStatusMeta,
);
