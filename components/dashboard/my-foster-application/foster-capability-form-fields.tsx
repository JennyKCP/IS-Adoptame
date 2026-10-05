"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FosterApplicationFormSchema } from "@/app/lib/zod-schemas/foster.schemas";
import { NumberField } from "@/components/forms/number-field";

type FosterApplicationFormValues = z.input<typeof FosterApplicationFormSchema>;

interface SpeciesOption {
  id: string;
  name: string;
}



const YesNoSelect = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: "true" | "false" | undefined;
  onChange: (value: "true" | "false") => void;
}) => (
  
  
  
  <Select name={name} onValueChange={onChange} value={value ?? ""}>
    <FormControl>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="No especificado" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      <SelectItem value="true">Sí</SelectItem>
      <SelectItem value="false">No</SelectItem>
    </SelectContent>
  </Select>
);

export const FosterCapabilityFormFields = ({
  form,
  species,
}: {
  form: ReturnType<typeof useForm<FosterApplicationFormValues>>;
  species: SpeciesOption[];
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-8">
      <FormField
        control={form.control}
        name="speciesIds"
        render={({ field }) => {
          const selectedIds: string[] = field.value || [];
          const toggle = (id: string) => {
            if (selectedIds.includes(id)) {
              field.onChange(selectedIds.filter((x) => x !== id));
            } else {
              field.onChange([...selectedIds, id]);
            }
          };
          return (
            <FormItem className="col-span-full flex flex-col">
              <FormLabel required>Especies que puedes acoger</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {selectedIds.length > 0
                        ? `${selectedIds.length} selected`
                        : "Selecciona especies"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                  <Command>
                    <CommandInput placeholder="Buscar especies..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron especies.</CommandEmpty>
                      <CommandGroup>
                        {species.map((s) => {
                          const checked = selectedIds.includes(s.id);
                          return (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => toggle(s.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  checked ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {s.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedIds.map((id) => {
                    const s = species.find((s) => s.id === id);
                    if (!s) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          className="rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <NumberField
        control={form.control}
        name="maxAnimals"
        label="Máximo de mascotas a la vez"
        className="col-span-3"
        min={1}
        required
      />

      <FormField
        control={form.control}
        name="hasQuarantineSpace"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Hay espacio disponible para cuarentena?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="canGiveOralMeds"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Puedes administrar medicamentos orales?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="canBottleFeed"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Puedes alimentar con biberón?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="canTransport"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Puedes transportar mascotas?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="acceptsMedical"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Puedes acoger casos médicos?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="acceptsHospice"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>¿Puedes acoger casos paliativos?</FormLabel>
            <YesNoSelect
              name={field.name}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="availabilityNotes"
        render={({ field }) => (
          <FormItem className="col-span-full">
            <FormLabel>Notas de disponibilidad</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Cuéntanos cualquier detalle sobre tu disponibilidad (horario, próximos viajes, etc.)."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
