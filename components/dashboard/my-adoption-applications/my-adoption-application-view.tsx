import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PencilLine } from "lucide-react";
import { MyAdoptionApplicationDetailPayload } from "@/app/lib/types";
import {
  formatDateOrNA,
  formatDateToLongString,
  formatTimeAgo,
} from "@/app/lib/utils/date-utils";
import { HouseholdReadOnlyRows } from "@/components/dashboard/household/household-read-only";
import { StatusHistoryTimeline } from "@/components/dashboard/applications/status-history-timeline";
import { ApplicationStatuses } from "./table/my-applications-options";
import { MyApplicationActions } from "./my-application-actions";
import { MyApplicationStatusMessage } from "./my-application-status-message";

const ReadOnlyRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <div className="flex items-center justify-between gap-4 border-b pb-2 text-sm">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right">{value || "N/A"}</span>
  </div>
);


export const MyAdoptionApplicationView = ({
  application,
}: {
  application: MyAdoptionApplicationDetailPayload;
}) => {
  const statusMeta = ApplicationStatuses.find(
    (s) => s.value === application.status,
  );
  const animal = application.animal;
  const breeds = animal.breeds.map((b) => b.name).join(", ");

  const addressLines = [
    application.applicantAddressLine1,
    application.applicantAddressLine2,
  ]
    .filter(Boolean)
    .join(", ");

  
  
  
  
  
  const editedByOtherAt =
    application.lastEditedById !== null &&
    application.lastEditedById !== application.applicantId
      ? application.lastEditedAt
      : null;

  return (
    <div className="space-y-8">
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="@[650px]/card:text-xl flex flex-wrap items-center gap-2">
            Solicitud de adopción para {animal.name}
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
            {[breeds || "Mixed Breed", animal.species.name]
              .filter(Boolean)
              .join(" · ")}{" "}
            &bull; Enviada el {formatDateOrNA(application.submittedAt)}.
          </CardDescription>
          <CardAction>
            <MyApplicationActions
              applicationId={application.id}
              status={application.status}
              animalName={animal.name}
              animalListingStatus={animal.listingStatus}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <MyApplicationStatusMessage status={application.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
          <CardDescription>
            Los datos de contacto que enviaste con esta solicitud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editedByOtherAt && (
            <Alert>
              <PencilLine className="h-4 w-4" />
              <AlertTitle>Modificado por el refugio</AlertTitle>
              <AlertDescription>
                Estas respuestas se modificaron por última vez
                {application.lastEditedBy
                  ? ` by ${application.lastEditedBy.name}`
                  : ""}{" "}
                el {formatDateToLongString(editedByOtherAt)} (
                {formatTimeAgo(editedByOtherAt)}). Contacta al refugio
                si algo aquí no expresa lo que querías indicar.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <ReadOnlyRow label="Nombre completo" value={application.applicantName} />
            <ReadOnlyRow label="Correo electrónico" value={application.applicantEmail} />
            <ReadOnlyRow label="Teléfono" value={application.applicantPhone} />
            <ReadOnlyRow label="Dirección" value={addressLines} />
            <ReadOnlyRow label="Ciudad" value={application.applicantCity} />
            <ReadOnlyRow label="Estado" value={application.applicantState} />
            <ReadOnlyRow
              label="Código postal"
              value={application.applicantZipCode}
            />
          </div>
        </CardContent>
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
          <CardTitle>Motivo de la adopción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-line">
            {application.reasonForAdoption}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
          <CardDescription>
            Cada cambio de esta solicitud y el motivo registrado por el refugio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusHistoryTimeline history={application.history} />
        </CardContent>
      </Card>
    </div>
  );
};
