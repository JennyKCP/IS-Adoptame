"use client";

import type { Row, StockFeatures } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { AnimalsPayload } from "@/app/lib/types";

interface DataTableRowActionsProps {
  row: Row<StockFeatures, AnimalsPayload>;
}

export function AnimalTableRowActions({ row }: DataTableRowActionsProps) {
  const animal = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <Link href={`/dashboard/animals/${animal.id}`}>
          <DropdownMenuItem>Perfil</DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <Link href={`/dashboard/animals/${animal.id}/edit`}>
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
