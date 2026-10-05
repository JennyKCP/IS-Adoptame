"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  
  decimal?: boolean;
};

export function NumberInput({
  value,
  onChange,
  decimal = false,
  step,
  inputMode,
  ...props
}: NumberInputProps) {
  return (
    <Input
      {...props}
      type="number"
      step={step ?? (decimal ? "any" : 1)}
      inputMode={inputMode ?? (decimal ? "decimal" : "numeric")}
      
      
      
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const parsed = Number(raw);
        onChange(Number.isNaN(parsed) ? null : parsed);
      }}
      
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
}
