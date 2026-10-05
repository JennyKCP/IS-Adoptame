"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ServerSideSortProps {
  paramKey: string;
  placeholder?: string;
  options: {
    label: string;
    value: string;
  }[];
  
  contentClassName?: string;
  
  triggerClassName?: string;
}

export function ServerSideSort({
  paramKey,
  placeholder,
  options,
  contentClassName,
  triggerClassName,
}: ServerSideSortProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue = searchParams.get(paramKey) || options[0]?.value;

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(paramKey, value);
    } else {
      params.delete(paramKey);
    }
    params.set("page", "1"); 
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <Label htmlFor="sort-order" className="sr-only text-sm font-medium">
        Sort by:
      </Label>
      <Select
        name="sort-order"
        onValueChange={handleValueChange}
        value={currentValue}
      >
        <SelectTrigger
          id="sort-order"
          className={cn("w-40 font-medium", triggerClassName)}
          size="sm"
        >
          <ArrowUpDown className="size-4 mr-2.5 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={cn(contentClassName)}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}