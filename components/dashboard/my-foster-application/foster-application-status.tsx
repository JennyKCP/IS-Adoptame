"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApplicationStatus } from "@/prisma/generated/enums";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withdrawMyFosterApplication } from "@/app/lib/actions/foster-application.actions";
import { MyFosterApplicationPayload } from "@/app/lib/types";
import { FormattedDate } from "@/components/common/formatted-date";
import { ApplicationStatuses } from "@/components/dashboard/my-adoption-applications/table/my-applications-options";
import { HouseholdReadOnlyRows } from "@/components/dashboard/household/household-read-only";
import { StatusHistoryTimeline } from "@/components/dashboard/applications/status-history-timeline";

const boolDisplay = (val: boolean | null | undefined) => {
  if (val === null || val === undefined) return "No disponible";
  return val ? "Sí" : "No";
};

const terminalStatuses: ApplicationStatus[] = [
  ApplicationStatus.WITHDRAWN,
  ApplicationStatus.REJECTED,
];

export const CapabilityReadOnlyRows = ({
  application,
}: {
  application: MyFosterApplicationPayload;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Especies</span>
      <span>
        {application.speciesCapabilities.length > 0
          ? application.speciesCapabilities.map((s) => s.name).join(", ")
          : "No disponible"}
      </span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Máximo de animales</span>
      <span>{application.maxAnimals}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Espacio de cuarentena</span>
      <span>{boolDisplay(application.hasQuarantineSpace)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Puede dar medicamentos orales</span>
      <span>{boolDisplay(application.canGiveOralMeds)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Puede alimentar con biberón</span>
      <span>{boolDisplay(application.canBottleFeed)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Puede transportar</span>
      <span>{boolDisplay(application.canTransport)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Acepta casos médicos</span>
      <span>{boolDisplay(application.acceptsMedical)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Acepta casos paliativos</span>
      <span>{boolDisplay(application.acceptsHospice)}</span>
    </div>
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">Notas de disponibilidad</span>
      <span>{application.availabilityNotes || "No disponible"}</span>
    </div>
  </div>
);

export function FosterApplicationStatus({
  application,
}: {
  application: MyFosterApplicationPayload;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusMeta = ApplicationStatuses.find(
    (s) => s.value === application.status,
  );
  const canWithdraw = !terminalStatuses.includes(application.status);

  const onWithdraw = () => {
    startTransition(async () => {
      const result = await withdrawMyFosterApplication(application.id);
      if (result.success) {
        toast.success(result.message ?? "Foster application withdrawn.");
        setConfirmOpen(false);
      } else {
        toast.error(result.message || "Failed to withdraw application.");
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="@[650px]/card:text-xl flex items-center gap-2">
            Mi solicitud de acogida
            {statusMeta && (
              <Badge variant="outline" className="flex w-fit items-center">
                {statusMeta.icon && (
                  <statusMeta.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                {statusMeta.label}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Enviada el <FormattedDate date={application.submittedAt} />.
          </CardDescription>
          {canWithdraw && (
            <CardAction>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    Retirar solicitud
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Retirar tu solicitud de acogida?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto retirará tu solicitud actual. Podrás enviar una
                      nueva más adelante si cambias de opinión.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        onWithdraw();
                      }}
                      disabled={isPending}
                    >
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Retirar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardAction>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hogar y estilo de vida</CardTitle>
        </CardHeader>
        <CardContent>
          <HouseholdReadOnlyRows hp={application} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacidades para acogida</CardTitle>
        </CardHeader>
        <CardContent>
          <CapabilityReadOnlyRows application={application} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusHistoryTimeline history={application.history} />
        </CardContent>
      </Card>
    </div>
  );
}
