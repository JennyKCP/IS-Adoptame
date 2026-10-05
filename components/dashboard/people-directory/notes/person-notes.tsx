"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PersonNotePayload } from "@/app/lib/types";
import { formatDateOrNA } from "@/app/lib/utils/date-utils";
import { TimeAgo } from "@/components/common/time-ago";
import { SimplePagination } from "../../../simple-pagination";
import { ServerSideFacetedFilter } from "@/components/table-common/server-side-faceted-filter";
import { ServerSideSort } from "@/components/table-common/server-side-sort";
import { PersonNoteForm } from "./person-note-form";
import { PersonNoteActions } from "./person-note-actions";

const noteStatusOptions = [
  { value: "active", label: "Activas" },
  { value: "deleted", label: "Eliminadas" },
];

interface Props {
  notes: PersonNotePayload[];
  totalPages: number;
  personId: string;
  canManage: boolean;
}

const PersonNotes = ({ notes, totalPages, personId, canManage }: Props) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="@[650px]/card:text-xl">
          Notas de la persona
        </CardTitle>

        <CardDescription>
          Registra notas importantes sobre esta persona.
        </CardDescription>

        <CardAction>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={canManage ? "default" : "outline"}
                size="sm"
                className="disabled:pointer-events-auto disabled:cursor-not-allowed"
                disabled={!canManage}
              >
                Agregar nota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-150">
              <DialogHeader>
                <DialogTitle>Agregar nota</DialogTitle>
                <DialogDescription>
                  Agrega una nota nueva para esta persona. Haz clic en crear
                  nota cuando termines.
                </DialogDescription>
              </DialogHeader>
              <PersonNoteForm
                personId={personId}
                onFormSubmit={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardAction>

        
        <div className="mt-4 flex flex-row flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ServerSideFacetedFilter
              title="Status"
              paramKey="status"
              options={noteStatusOptions}
            />
          </div>

          <div className="flex items-center gap-2">
            <ServerSideSort
              paramKey="sort"
              placeholder="Seleccionar orden"
              options={[
                { label: "Más recientes primero", value: "createdAt.desc" },
                { label: "Más antiguas primero", value: "createdAt.asc" },
              ]}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className={clsx(
                  "border rounded-lg p-4 relative group",
                  note.deletedAt && "opacity-60",
                )}
              >
                {canManage && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PersonNoteActions note={note} personId={personId} />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    {note.deletedAt && (
                      <div className="mb-2">
                      <Badge variant="destructive">Eliminada</Badge>
                      </div>
                    )}

                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>

                    <div className="text-xs text-muted-foreground mt-3">
                      <span>{note.author?.name ?? "Usuario desconocido"}</span>{" "}
                      &middot;{" "}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TimeAgo
                            date={note.createdAt}
                            className="underline decoration-dotted cursor-help"
                          />
                        </TooltipTrigger>

                        <TooltipContent>
                          {formatDateOrNA(note.createdAt)}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {note.lastEditedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>
                          editada por{" "}
                          {note.lastEditedBy?.name ?? "Usuario desconocido"}
                        </span>{" "}
                        &middot;{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TimeAgo
                              date={note.lastEditedAt}
                              className="underline decoration-dotted cursor-help"
                            />
                          </TooltipTrigger>

                          <TooltipContent>
                            {formatDateOrNA(note.lastEditedAt)}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12 px-6 border-2 border-dashed rounded-lg">
              <p className="font-semibold text-lg">No hay notas</p>

              <p className="text-sm mt-1">
                Ajusta los filtros o crea una nota nueva.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <SimplePagination totalPages={totalPages} />
      </CardFooter>
    </Card>
  );
};

export default PersonNotes;
