"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColorModel } from "@/prisma/generated/models/Color";
import { ColorForm } from "./color-form";
import {
  deleteColor,
  restoreColor,
} from "@/app/lib/actions/colors-catalog.actions";
import { toast } from "sonner";

interface Props {
  color: ColorModel;
}

export function ColorActions({ color }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSoftDelete = () => {
    startTransition(() => {
      deleteColor(color.id).then((data) => {
        if (data?.success) {
          toast.success(data.message, {
            action: {
              label: "Undo",
              onClick: () => onRestore(),
            },
          });
        } else if (data?.message) {
          toast.error(data.message);
        }
      });
    });
  };

  const onRestore = () => {
    startTransition(() => {
      restoreColor(color.id).then((data) => {
        if (data?.success) {
          toast.success(data.message);
        } else if (data?.message) {
          toast.error(data.message);
        }
      });
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>Editar</DropdownMenuItem>
          </DialogTrigger>
          {color.deletedAt ? (
            <DropdownMenuItem onClick={onRestore} disabled={isPending}>
              Restaurar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={onSoftDelete}
              disabled={isPending}
            >
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar color</DialogTitle>
          <DialogDescription>
            Actualiza el nombre de este color. Haz clic en actualizar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <ColorForm onFormSubmit={() => setIsDialogOpen(false)} color={color} />
      </DialogContent>
    </Dialog>
  );
}
