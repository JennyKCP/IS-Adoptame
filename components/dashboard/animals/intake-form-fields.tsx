import { parseISO } from "date-fns";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DayField } from "@/components/forms/day-field";
import type { CalendarDay } from "@/app/lib/utils/shelter-day";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IntakeType } from "@/prisma/generated/enums";
import { intakeTypeOptions } from "@/app/lib/utils/enum-formatter";
import { US_STATES } from "@/app/lib/constants/us-states";
import { PartnerPayload } from "@/app/lib/types";
import { FieldValues, Control, Path, useWatch } from "react-hook-form";
import { IntakeFieldsValues } from "@/app/lib/zod-schemas/intake.schema";
import { PersonPicker } from "@/components/common/person-picker";

interface IntakeFormFieldsProps<T extends FieldValues & IntakeFieldsValues> {
  control: Control<T>;
  partners: PartnerPayload[];
  
  initialSurrenderingPerson?: { id: string; name: string };
  suggestedSurrenderingPersonId?: string;
  suggestedSurrenderingPersonLabel?: string;
  canCreatePerson?: boolean;
  
  today: CalendarDay;
}

export const IntakeFormFields = <T extends FieldValues & IntakeFieldsValues>({
  control,
  partners,
  initialSurrenderingPerson,
  suggestedSurrenderingPersonId,
  suggestedSurrenderingPersonLabel,
  canCreatePerson,
  today,
}: IntakeFormFieldsProps<T>) => {
  
  
  
  
  const intakeType = useWatch({
    control,
    name: "intakeType" as Path<T>,
  }) as IntakeType | undefined;

  return (
    <div className="space-y-6">
      <h3 className="font-semibold border-b pb-2">Detalles del ingreso y origen</h3>

      <div className="grid grid-cols-1 @[662px]:grid-cols-6 gap-x-4 gap-y-8">
        <FormField
          control={control}
          name={"intakeType" as Path<T>}
          render={({ field }) => (
            <FormItem className="col-span-3">
              <FormLabel required>Tipo de ingreso</FormLabel>
              <Select
                name={field.name}
                onValueChange={field.onChange}
                value={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {intakeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DayField
          control={control}
          name={"intakeDate" as Path<T>}
          label="Intake Date"
          className="col-span-3"
          triggerClassName="w-full pl-3"
          required
          
          
          
          disabledDates={(date) =>
            date > parseISO(today) || date < parseISO("1900-01-01")
          }
        />

        <FormField
          control={control}
          name={"notes" as Path<T>}
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Notas internas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cualquier nota sobre el evento de ingreso..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      
      <div className="pt-6">
        {!intakeType && (
          <p className="text-sm text-center text-muted-foreground p-4 border border-dashed rounded-md">
            Please select an Intake Type above to enter source details.
          </p>
        )}

        {intakeType === IntakeType.TRANSFER_IN && (
          <div className="grid grid-cols-1 @[662px]:grid-cols-6 gap-x-4 gap-y-8 p-4 border rounded-md">
            <h4 className="font-semibold col-span-full">Detalles de la transferencia</h4>
            <FormField
              control={control}
              name={"sourcePartnerId" as Path<T>}
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel required>Socio de origen</FormLabel>
                  <Select
                    name={field.name}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un refugio o grupo de rescate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {intakeType === IntakeType.STRAY && (
          <div className="grid grid-cols-1 @[662px]:grid-cols-6 gap-x-4 gap-y-8 p-4 border rounded-md">
            <h4 className="font-semibold col-span-full">Lugar donde fue encontrado</h4>
            <FormField
              control={control}
              name={"foundCity" as Path<T>}
              render={({ field }) => (
                <FormItem className="col-span-3">
                  <FormLabel required>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={"foundState" as Path<T>}
              render={({ field }) => (
                <FormItem className="col-span-3">
                  <FormLabel required>State</FormLabel>
                  <Select
                    name={field.name}
                    autoComplete="address-level1"
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={"foundAddress" as Path<T>}
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel required>Address / Cross Streets</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej.: esquina de la calle Principal y avenida Parque"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        
        <div
          hidden={intakeType !== IntakeType.OWNER_SURRENDER}
          className="grid grid-cols-1 @[662px]:grid-cols-6 gap-x-4 gap-y-8 p-4 border rounded-md"
        >
          <h4 className="font-semibold col-span-full">
            Surrendering Person Details
          </h4>
          <FormField
            control={control}
            name={"surrenderingPersonId" as Path<T>}
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel required>Persona que entrega al animal</FormLabel>
                <FormControl>
                  <PersonPicker
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? "")}
                    initialSelection={initialSurrenderingPerson}
                    suggestedPersonId={suggestedSurrenderingPersonId}
                    suggestedPersonLabel={suggestedSurrenderingPersonLabel}
                    canCreatePerson={canCreatePerson}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
