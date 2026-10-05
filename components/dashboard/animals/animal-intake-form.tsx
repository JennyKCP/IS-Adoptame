"use client";

import { createAnimal, updateAnimal } from "@/app/lib/actions/animal.actions";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { parseISO } from "date-fns";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { Check, ChevronsUpDown, Loader2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
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
  AnimalHealthStatus,
  AnimalListingStatus,
  Sex,
} from "@/prisma/generated/enums";
import {
  animalHealthStatusOptions,
  animalListingStatusOptions,
  animalSexOptions,
} from "@/app/lib/utils/enum-formatter";
import {
  CreateAnimalFormSchema,
  AnimalEditFormSchema,
  type CreateAnimalFormInput,
} from "@/app/lib/zod-schemas/animal.schemas";
import { sizeOptions } from "@/components/dashboard/animals/table/animal-options";
import {
  AnimalIntakeFormPayload,
  ColorPayload,
  PartnerPayload,
  SpeciesPayload,
} from "@/app/lib/types";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { IntakeFormFields } from "./intake-form-fields";
import { UnitPickerLocation } from "@/app/lib/data/locations/unit-picker.data";
import { formatDateToLongString } from "@/app/lib/utils/date-utils";
import type { WeightUnitSystem } from "@/app/lib/utils/shelter-settings";
import { formatWeight } from "@/app/lib/utils/weight-format";
import { WeightInput } from "@/components/forms/weight-input";
import { NumberField } from "@/components/forms/number-field";
import { FieldInfo } from "@/components/forms/field-info";
import { applyFieldErrors } from "@/app/lib/utils/form-result-utils";



const UNPLACED_VALUE = "__unplaced__";



const SIZE_NOT_SPECIFIED_VALUE = "__not_specified__";

type AnimalFormValues = CreateAnimalFormInput;

interface AnimalFormProps {
  speciesList: SpeciesPayload[];
  unitSystem: WeightUnitSystem;
  partners: PartnerPayload[];
  colors: ColorPayload[];
  unitOptions: UnitPickerLocation[];
  animal?: AnimalIntakeFormPayload;
  canCreatePerson?: boolean;
  
  today: CalendarDay;
}

const AnimalForm = ({
  speciesList,
  unitSystem,
  partners,
  colors,
  unitOptions,
  animal,
  canCreatePerson,
  today,
}: AnimalFormProps) => {
  const router = useRouter();
  const isEditMode = !!animal;

  const isStatusLocked =
    animal?.listingStatus === AnimalListingStatus.PENDING_ADOPTION ||
    animal?.listingStatus === AnimalListingStatus.ARCHIVED;

  
  
  
  const isUnitLocked = animal?.listingStatus === AnimalListingStatus.ARCHIVED;

  const defaultStatusOptions = animalListingStatusOptions.filter(
    (opt) =>
      opt.value === AnimalListingStatus.DRAFT ||
      opt.value === AnimalListingStatus.PUBLISHED,
  );
  const availableStatusOptions =
    isEditMode && isStatusLocked
      ? animalListingStatusOptions.filter(
          (opt) => opt.value === animal.listingStatus,
        )
      : defaultStatusOptions;

  const [isPending, startSubmitTransition] = useTransition();
  const [currentSpeciesId, setCurrentSpeciesId] = useState(
    animal?.speciesId || "",
  );

  
  
  const [currentLocationId, setCurrentLocationId] = useState(
    animal?.currentUnitId
      ? (unitOptions.find((loc) =>
          loc.units.some((u) => u.id === animal.currentUnitId),
        )?.id ?? "")
      : "",
  );

  const form = useForm<AnimalFormValues>({
    
    
    
    
    
    resolver: (isEditMode
      ? standardSchemaResolver(AnimalEditFormSchema)
      : standardSchemaResolver(CreateAnimalFormSchema)) as Resolver<
      AnimalFormValues,
      unknown,
      AnimalFormValues
    >,
    defaultValues: isEditMode
      ? {
          animalName: animal.name,
          species: animal.speciesId,
          breed: animal.breeds[0]?.id || "",
          primaryColor: animal.primaryColorId || "",
          additionalColors: animal.colors
            .filter((c) => c.id !== animal.primaryColorId)
            .map((c) => c.id),
          sex: animal.sex,
          size: animal.size ?? "",
          estimatedBirthDate: animal.birthDate,
          heightCm: animal.heightCm ?? null,
          healthStatus: animal.healthStatus ?? AnimalHealthStatus.HEALTHY,
          microchipNumber: animal.microchipNumber || "",
          isSpayedNeutered: animal.isSpayedNeutered,
          listingStatus: animal.listingStatus,
          description: animal.description || "",
          currentUnitId: animal.currentUnitId || "",
        }
      : {
          
          
          intakeDate: today,
          animalName: "",
          description: "",
          intakeType: undefined,
          species: "",
          sex: Sex.UNKNOWN,
          size: "",
          breed: "",
          primaryColor: "",
          additionalColors: [],
          weightGrams: null,
          heightCm: null,
          microchipNumber: "",
          isSpayedNeutered: false,
          listingStatus: AnimalListingStatus.DRAFT,
          currentUnitId: "",
          notes: "",
          healthStatus: AnimalHealthStatus.HEALTHY,
          sourcePartnerId: "",
          foundAddress: "",
          foundCity: "",
          foundState: "",
          surrenderingPersonId: "",
        },
  });

  const onSubmit = (values: AnimalFormValues) => {
    startSubmitTransition(async () => {
      const result = isEditMode
        ? await updateAnimal(animal.id, values)
        : await createAnimal(values);

      if (result.ok) {
        toast.success(result.message);
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        return;
      }

      applyFieldErrors(form, result.fieldErrors);
      toast.error(result.message);
    });
  };

  const selectedSpecies = speciesList.find((s) => s.id === currentSpeciesId);

  
  
  
  
  
  
  const selectedBreedId = useWatch({ control: form.control, name: "breed" });
  const [isSizeTouched, setIsSizeTouched] = useState(false);

  useEffect(() => {
    if (isSizeTouched) return;
    if (form.getValues("size")) return;
    const breed = selectedSpecies?.breeds.find((b) => b.id === selectedBreedId);
    if (breed?.typicalSize) {
      form.setValue("size", breed.typicalSize);
    }
  }, [selectedBreedId, isSizeTouched, form, selectedSpecies]);

  const selectedLocation = unitOptions.find((l) => l.id === currentLocationId);

  
  
  
  const primaryColorId = useWatch({ control: form.control, name: "primaryColor" });

  
  const formatUnitOption = (unit: UnitPickerLocation["units"][number]) => {
    const hint = `${unit.name} · ${unit.occupancy}/${unit.capacity}`;
    return unit.occupancy >= unit.capacity ? `${hint} (full)` : hint;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="@container space-y-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {isEditMode ? "Edit Animal Details" : "New Animal Intake"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? `Editing the record for ${animal.name}.`
                : "Enter all details for the incoming animal on this single form."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            
            <div className="space-y-6">
              <h3 className="font-semibold border-b pb-2">
                Animal Information
              </h3>
              <div className="grid grid-cols-1 @[662px]:grid-cols-6 gap-x-4 gap-y-8">
                <FormField
                  control={form.control}
                  name="animalName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel required>Nombre del animal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej.: Toby"
                          {...field}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel required>Species</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setCurrentSpeciesId(value);
                          form.setValue("breed", "");
                        }}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una especie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {speciesList.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel required>Breed</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!currentSpeciesId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una raza" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(selectedSpecies?.breeds || []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel required>Primary Color</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona un color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colors.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalColors"
                  render={({ field }) => {
                    const selectedIds: string[] = field.value || [];
                    
                    const available = colors.filter(
                      (c) => c.id !== primaryColorId,
                    );
                    const toggle = (id: string) => {
                      if (selectedIds.includes(id)) {
                        field.onChange(selectedIds.filter((x) => x !== id));
                      } else {
                        field.onChange([...selectedIds, id]);
                      }
                    };
                    return (
                      <FormItem className="col-span-2 flex flex-col">
                        <FormLabel>Additional Colors</FormLabel>
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
                                  : "Select colors"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                            <Command>
                              <CommandInput placeholder="Buscar colores..." />
                              <CommandList>
                                <CommandEmpty>No se encontró el color.</CommandEmpty>
                                <CommandGroup>
                                  {available.map((c) => {
                                    const checked = selectedIds.includes(c.id);
                                    return (
                                      <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        onSelect={() => toggle(c.id)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            checked
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.name}
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
                              const color = colors.find((c) => c.id === id);
                              if (!color) return null;
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {color.name}
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
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel required>Sex</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona el sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {animalSexOptions.map((option) => (
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
                  control={form.control}
                  name="estimatedBirthDate"
                  label="Estimated Birth Date"
                  className="col-span-2"
                  triggerClassName="w-full pl-3"
                  required
                  
                  
                  
                  disabledDates={(date) =>
                    date > parseISO(today) || date < parseISO("1900-01-01")
                  }
                />
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Expected Adult Size</FormLabel>
                        <FieldInfo label="About expected adult size">
                          How big this animal is expected to be when fully
                          grown. Not its current size.
                        </FieldInfo>
                      </div>
                      <Select
                        name={field.name}
                        onValueChange={(value) => {
                          setIsSizeTouched(true);
                          field.onChange(
                            value === SIZE_NOT_SPECIFIED_VALUE ? "" : value,
                          );
                        }}
                        value={field.value || SIZE_NOT_SPECIFIED_VALUE}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No especificado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SIZE_NOT_SPECIFIED_VALUE}>
                            Not specified
                          </SelectItem>
                          {sizeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <FormDescription className="sr-only">
                        How big this animal is expected to be when fully
                        grown. Not its current size.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="healthStatus"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel required>Estado de salud</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona el estado de salud" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {animalHealthStatusOptions.map((option) => (
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
                {isEditMode ? (
                  
                  
                  
                  
                  
                  <div className="col-span-2">
                    <FormLabel className="mb-2 block">Weight</FormLabel>
                    <p className="text-sm">
                      {animal.currentWeightGrams != null
                        ? formatWeight(animal.currentWeightGrams, unitSystem)
                        : "Not recorded"}
                    </p>
                    {animal.vitalsLogs[0] && (
                      <p className="text-xs text-muted-foreground mt-1">
                        as of{" "}
                        {formatDateToLongString(animal.vitalsLogs[0].recordedAt)}
                      </p>
                    )}
                    <Link
                      href={`/dashboard/animals/${animal.id}/vitals`}
                      className="text-xs text-primary underline underline-offset-2 mt-1 inline-block"
                    >
                      View vitals history
                    </Link>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="weightGrams"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <WeightInput
                            unitSystem={unitSystem}
                            placeholder="e.g., 15.5"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <NumberField
                  control={form.control}
                  name="heightCm"
                  label="Height (cm)"
                  className="col-span-2"
                  decimal
                  placeholder="e.g., 55"
                />
                <FormField
                  control={form.control}
                  name="microchipNumber"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Microchip Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 900123000456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isSpayedNeutered"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Spayed / Neutered</FormLabel>
                      <div className="flex h-9 items-center">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="listingStatus"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <FormLabel required>Estado de publicación</FormLabel>
                        {isStatusLocked && (
                          <FieldInfo
                            label="Why the listing status is locked"
                            tone="warning"
                            icon={TriangleAlert}
                          >
                            Status is locked. It can only be changed via the
                            application or outcome process.
                          </FieldInfo>
                        )}
                      </div>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isStatusLocked}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona el estado de publicación" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {isStatusLocked && (
                        <FormDescription className="sr-only">
                          Status is locked. It can only be changed via the
                          application or outcome process.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormItem className="col-span-3">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="animal-location">Ubicación</Label>
                    <FieldInfo label="About location">
                      Where the animal is physically housed. Leave as Unplaced
                      if unknown.
                    </FieldInfo>
                  </div>
                  <Select
                    name="locationId"
                    value={currentLocationId || UNPLACED_VALUE}
                    disabled={isUnitLocked}
                    onValueChange={(value) => {
                      const locationId =
                        value === UNPLACED_VALUE ? "" : value;
                      setCurrentLocationId(locationId);
                      
                      
                      form.setValue("currentUnitId", "");
                    }}
                  >
                    <SelectTrigger
                      id="animal-location"
                      className="w-full"
                      aria-describedby="location-hint"
                    >
                      <SelectValue placeholder="Selecciona una ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNPLACED_VALUE}>Unplaced</SelectItem>
                      {unitOptions.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <p id="location-hint" className="sr-only">
                    Where the animal is physically housed. Leave as Unplaced if
                    unknown.
                  </p>
                </FormItem>
                <FormField
                  control={form.control}
                  name="currentUnitId"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Unit</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={!currentLocationId || isUnitLocked}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(selectedLocation?.units || []).map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {formatUnitOption(unit)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cuéntanos sobre la personalidad, particularidades y cualidades de este animal. Ayuda a los posibles adoptantes a imaginarlo en un hogar lleno de cariño."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            
            {!isEditMode && (
              <IntakeFormFields
                control={form.control}
                partners={partners}
                canCreatePerson={canCreatePerson}
                today={today}
              />
            )}
          </CardContent>

          <CardFooter className="flex justify-end space-x-4">
            <Button
              asChild
              variant="outline"
              type="button"
              disabled={isPending}
            >
              <Link href={`/dashboard/animals`}>Cancelar</Link>
            </Button>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? isEditMode
                  ? "Updating..."
                  : "Submitting..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Intake"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

export default AnimalForm;
