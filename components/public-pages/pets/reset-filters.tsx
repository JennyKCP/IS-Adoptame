"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESET_FILTER_SHAPE } from "@/components/table-common/reset-filter-shape";
import { cn } from "@/lib/utils";

interface ResetFiltersProps {
  
  filterParamKeys?: string[];
}

export function ResetFilters({
  filterParamKeys = ["query", "category", "color"],
}: ResetFiltersProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const isFiltered = filterParamKeys.some((key) => searchParams.has(key));

  if (!isFiltered) return null;

  return (
    
    
    
    
    
    
    
    <Button
      variant="ghost"
      onClick={() => router.push(pathname)}
      className={cn(
        RESET_FILTER_SHAPE,
        "h-9 border-primary/45 text-primary",
        "hover:border-primary hover:bg-primary hover:text-primary-foreground",
        "focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground"
      )}
    >
      Restablecer
      <X className="size-3.5" />
    </Button>
  );
}
