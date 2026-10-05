"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import type { RowData, StockFeatures, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "@/components/table-common/data-table-view-options";
import { RESET_FILTER_SHAPE } from "@/components/table-common/reset-filter-shape";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps<TData extends RowData> {
  table: Table<StockFeatures, TData>;
  
  searchPlaceholder?: string;
  searchId?: string;
  
  filterParamKeys?: string[];
  
  filters?: React.ReactNode;
  extraActions?: React.ReactNode;
}

export function DataTableToolbar<TData extends RowData>({
  table,
  searchPlaceholder,
  searchId,
  filterParamKeys = [],
  filters,
  extraActions,
}: DataTableToolbarProps<TData>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const currentQuery = searchParams.get("query")?.toString() ?? "";

  const isFiltered =
    searchParams.has("query") ||
    filterParamKeys.some((key) => searchParams.has(key));

  const showSearch = Boolean(searchId);

  return (
    <div className="@container/toolbar flex items-center justify-between">
      <div
        className={
          showSearch
            ? "grid grid-cols-1 items-center gap-y-2 @[736px]/toolbar:grid-cols-[200px_1fr] @[736px]/toolbar:gap-x-4"
            : "flex items-center"
        }
      >
        {showSearch && (
          <div>
            <Input
              
              
              
              
              key={currentQuery}
              id={searchId}
              placeholder={searchPlaceholder}
              onChange={(e) => handleSearch(e.target.value)}
              defaultValue={currentQuery}
              className="h-8 w-64 @[736px]/toolbar:w-full"
            />
          </div>
        )}
        <div className="space-x-2 @[736px]/toolbar:justify-self-start items-center flex">
          {filters}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => router.push(pathname)}
              className={cn(
                RESET_FILTER_SHAPE, "rounded-md",
                
                
                
                
                
                "h-8 border-primary/45 text-primary",
                "hover:border-primary hover:bg-primary hover:text-primary-foreground",
                
                
                
                
                "dark:hover:bg-primary",
                "focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground"
              )}
            >
              Reset
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex self-start gap-2">
        <DataTableViewOptions table={table} />
        {extraActions}
      </div>
    </div>
  );
}
