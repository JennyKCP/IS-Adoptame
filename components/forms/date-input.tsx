"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  
  placeholder?: string;
  
  disabledDates?: (date: Date) => boolean;
  
  clearable?: boolean;
  
  keepValueOnDeselect?: boolean;
  iconPosition?: "leading" | "trailing";
  
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}


export function DateInput({
  value,
  onChange,
  placeholder = "Pick a date",
  disabledDates,
  clearable = false,
  keepValueOnDeselect = false,
  iconPosition = "trailing",
  className,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DateInputProps) {
  const icon = (
    <CalendarIcon
      className={cn(
        "h-4 w-4 opacity-50",
        iconPosition === "trailing" ? "ml-auto" : "mr-2",
      )}
    />
  );

  const trigger = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          type="button"
          variant="outline"
          className={cn(
            "text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {iconPosition === "leading" && icon}
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
          {iconPosition === "trailing" && icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (!date && keepValueOnDeselect) return;
            onChange(date);
          }}
          disabled={disabledDates}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );

  if (!clearable) return trigger;

  return (
    <div className="flex items-center gap-2">
      {trigger}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear date"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
