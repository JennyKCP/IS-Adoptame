"use client";

import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateInput, type DateInputProps } from "@/components/forms/date-input";

type DayFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  
  className?: string;
  
  triggerClassName?: string;
  
  required?: boolean;
  
  description?: ReactNode;
} & Omit<
  DateInputProps,
  | "value"
  | "onChange"
  | "aria-label"
  | "id"
  | "className"
  | "keepValueOnDeselect"
>;


export function DayField<TValues extends FieldValues>({
  control,
  name,
  label,
  className,
  triggerClassName,
  required = false,
  description,
  ...inputProps
}: DayFieldProps<TValues>) {
  const { placeholder = "Pick a date" } = inputProps;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const day = field.value as string | null | undefined;
        const picked = day ? parseISO(day) : undefined;
        const value =
          picked && !Number.isNaN(picked.getTime()) ? picked : undefined;

        return (
          <FormItem className={className}>
            <FormLabel htmlFor={name} required={required}>
              {label}
            </FormLabel>
            <FormControl>
              <DateInput
                id={name}
                className={triggerClassName}
                keepValueOnDeselect={required}
                value={value}
                
                
                
                
                onChange={(date) =>
                  field.onChange(date ? format(date, "yyyy-MM-dd") : null)
                }
                aria-label={`${label}${required ? " *" : ""}: ${
                  value ? format(value, "PPP") : placeholder
                }`}
                {...inputProps}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
