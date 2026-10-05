"use client";

import { format } from "date-fns";
import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateInput, type DateInputProps } from "@/components/forms/date-input";

type DateFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  
  className?: string;
  
  triggerClassName?: string;
  
  required?: boolean;
} & Omit<
  DateInputProps,
  | "value"
  | "onChange"
  | "aria-label"
  | "id"
  | "className"
  | "keepValueOnDeselect"
>;


export function DateField<TValues extends FieldValues>({
  control,
  name,
  label,
  className,
  triggerClassName,
  required = false,
  ...inputProps
}: DateFieldProps<TValues>) {
  const { placeholder = "Pick a date" } = inputProps;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? undefined) as Date | undefined;

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
                
                
                
                
                onChange={(date) => field.onChange(date ?? null)}
                aria-label={`${label}${required ? " *" : ""}: ${
                  value ? format(value, "PPP") : placeholder
                }`}
                {...inputProps}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
