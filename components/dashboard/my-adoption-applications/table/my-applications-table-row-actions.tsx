"use client";

import type { Row, StockFeatures } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MyAdoptionApplicationPayload } from "@/app/lib/types";
import Link from "next/link";

interface DataTableRowActionsProps {
  row: Row<StockFeatures, MyAdoptionApplicationPayload>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const myApplication = row.original;

  
  
  
  
  
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <Link href={`/dashboard/my-adoption-applications/${myApplication.id}`}>
          <DropdownMenuItem>Ver solicitud</DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
