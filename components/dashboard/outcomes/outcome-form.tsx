"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";
import { toast } from "sonner";
import {
  AdoptionApplicationPayload,
  OutcomePayload,
  PartnerPayload,
} from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DayField } from "@/components/forms/day-field";
import type { CalendarDay } from "@/app/lib/utils/shelter-day";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PersonPicker } from "@/components/common/person-picker";
import { outcomeTypeOptions } from "@/app/lib/utils/enum-formatter";
import {
  createOutcome,
  updateOutcome,
} from "@/app/lib/actions/outcome.actions";
import {
  OutcomeFormSchema,
  type OutcomeFormInput,
} from "@/app/lib/zod-schemas/outcome.schema";
import { applyFieldErrors } from "@/app/lib/utils/form-result-utils";

export type OutcomeFormValues = OutcomeFormInput;

interface AnimalForOutcome {
  id: string;
  name: string;
}

interface OutcomeFormProps {
  animal: AnimalForOutcome;
  application?: AdoptionApplicationPayload; 
  outcome?: OutcomePayload; 
  
  endedFosterPlacement?: boolean;
  partners: PartnerPayload[]; 
  suggestedOwnerId?: string; 
  suggestedOwnerLabel?: string;
  canCreatePerson?: boolean;
  
  today: CalendarDay;
}

const buildDefaultValues = (
  today: CalendarDay,
  outcome?: OutcomePayload,
  application?: AdoptionApplicationPayload,
): DefaultValues<OutcomeFormValues> => ({
  
  
  outcomeDate: outcome?.outcomeDate ?? today,
  
  
  
  outcomeType: outcome?.type ?? (application ? "ADOPTION" : undefined),
  destinationPartnerId: outcome?.destinationPartnerId ?? "",
  ownerId: outcome?.ownerId ?? "",
  notes: outcome?.notes ?? "",
});

export function OutcomeForm({
  animal,
  application,
  outcome,
  endedFosterPlacement,
  partners,
  suggestedOwnerId,
  suggestedOwnerLabel,
  canCreatePerson,
  today,
}: OutcomeFormProps) {
  const isEditMode = !!outcome;
  const router = useRouter();
  const [isPending, startSubmitTransition] = useTransition();

  const isAdoptionOutcome = !!application;

  const filteredOutcomeTypeOptions = isAdoptionOutcome
    ? outcomeTypeOptions.filter((option) => option.value === "ADOPTION")
    : outcomeTypeOptions.filter((option) => option.value !== "ADOPTION");

  const form = useForm<OutcomeFormValues>({
    resolver: standardSchemaResolver(OutcomeFormSchema),
    defaultValues: buildDefaultValues(today, outcome, application),
  });

  
  
  const outcomeTypeValue = useWatch({
    control: form.control,
    name: "outcomeType",
  });

  const handleFormSubmit = (values: OutcomeFormValues) => {
    startSubmitTransition(async () => {
      const result = isEditMode
        ? await updateOutcome(outcome.id, values)
        : await createOutcome(
            {
              animalId: animal.id,
              adoptionApplicationId: application?.id,
            },
            values,
          );

      if (result.ok) {
        toast.success(result.message);
        if (result.redirectTo) {
          router.push(result.redirectTo);
          return;
        }
        form.reset(values);
        return;
      }

      applyFieldErrors(form, result.fieldErrors);
      toast.error(result.message);
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-8"
      >
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {isEditMode ? "Edit Outcome" : "Process Animal Outcome"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? `Update the outcome details for ${animal.name}.`
                : `Finalize the journey for ${animal.name}. This action will archive the animal's record.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="outcomeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Outcome Type</FormLabel>
                    
                    <Select
                      name={field.name}
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={isAdoptionOutcome || isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredOutcomeTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEditMode && (
                      <FormDescription>
                        A wrong type is fixed by reversing this outcome and
                        recording the right one.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DayField
                control={form.control}
                name="outcomeDate"
                label="Date of Outcome"
                className="flex flex-col"
                triggerClassName="pl-3"
                required
                
                
                
                disabledDates={(date) => date > parseISO(today)}
                description={
                  isEditMode && endedFosterPlacement
                    ? "This outcome ended a foster placement. Changing the date moves the placement's end day with it."
                    : undefined
                }
              />
            </div>

            {outcomeTypeValue === "TRANSFER_OUT" && (
              <FormField
                control={form.control}
                name="destinationPartnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Destination Partner</FormLabel>
                    <Select
                      name={field.name}
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un refugio o grupo de rescate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            
            <div hidden={outcomeTypeValue !== "RETURN_TO_OWNER"}>
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Owner</FormLabel>
                    <FormControl>
                      <PersonPicker
                        value={field.value || null}
                        onChange={(id) => field.onChange(id ?? "")}
                        initialSelection={outcome?.owner ?? undefined}
                        suggestedPersonId={suggestedOwnerId}
                        suggestedPersonLabel={suggestedOwnerLabel}
                        canCreatePerson={canCreatePerson}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Agrega notas relevantes sobre este resultado..."
                      className="resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-end space-x-4">
            <Button
              asChild
              variant="outline"
              type="button"
              disabled={isPending}
            >
              <Link href={`/dashboard/animals/${animal.id}`}>Cancelar</Link>
            </Button>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? isEditMode
                  ? "Updating..."
                  : "Processing..."
                : isEditMode
                  ? "Update Outcome"
                  : "Process Outcome"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
