"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createMyAdoptionApp,
  updateMyAdoptionApp,
} from "@/app/lib/actions/my-adoption-application.actions";
import { applyFieldErrors } from "@/app/lib/utils/form-result-utils";
import {
  AdoptionApplicationPayload,
  AnimalForAdoptionApplicationPayload,
} from "@/app/lib/types";
import {
  MyAdoptionAppFormSchema,
  type MyAdoptionAppFormInput,
} from "@/app/lib/zod-schemas/myAdoptionApplication.schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequiredFieldsLegend } from "@/components/forms/required-fields-legend";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { US_STATES } from "@/app/lib/constants/us-states";
import { livingSituationOptions } from "@/app/lib/utils/enum-formatter";
import { AdoptionApplicantDefaultsPayload } from "@/app/lib/data/my-adoption-applications.data";
import { toYesNo, boolToSelectValue } from "@/app/lib/utils/form-utils";
import { NumberInput } from "@/components/forms/number-input";
import { isRenting } from "@/app/lib/zod-schemas/household-profile.schemas";

type MyApplicationFormData = MyAdoptionAppFormInput;

type FormVariant = "dashboard" | "public";

const SECTION_COUNT = 3;


function FormSection({
  variant,
  step,
  title,
  contentClassName,
  children,
}: {
  variant: FormVariant;
  step: number;
  title: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  if (variant === "public") {
    return (
      <section
        aria-labelledby={`adoption-section-${step}`}
        className={step > 1 ? "border-t border-border pt-10 sm:pt-14" : undefined}
      >
        <div className="grid gap-7 lg:grid-cols-[0.8fr_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="mb-2 font-display text-[13px] tracking-[0.06em] text-organic-accent-700">
              Paso {step} de {SECTION_COUNT}
            </div>
            <h2
              id={`adoption-section-${step}`}
              className="max-w-[12ch] font-display text-[28px] sm:text-[32px]"
            >
              {title}
            </h2>
          </div>
          <div className={`min-w-0 ${contentClassName ?? ""}`.trim()}>
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

interface MyApplicationFormProps {
  animal: AnimalForAdoptionApplicationPayload;
  application?: AdoptionApplicationPayload;
  applicantDefaults?: AdoptionApplicantDefaultsPayload | null;
  
  selectContentClassName?: string;
  
  variant?: FormVariant;
}

export function MyApplicationForm({
  animal,
  application,
  applicantDefaults,
  selectContentClassName,
  variant = "dashboard",
}: MyApplicationFormProps) {
  const isEditMode = !!application;

  const cancelHref = isEditMode
    ? "/dashboard/my-adoption-applications"
    : `/pets/${animal.id}`;

  const [isPending, startSubmitTransition] = useTransition();
  const router = useRouter();

  const household = applicantDefaults?.householdProfile;

  const form = useForm<MyApplicationFormData>({
    resolver: standardSchemaResolver(MyAdoptionAppFormSchema),
    
    
    defaultValues: {
      applicantName:
        application?.applicantName ?? applicantDefaults?.name ?? "",
      applicantEmail:
        application?.applicantEmail ?? applicantDefaults?.email ?? "",
      applicantPhone:
        application?.applicantPhone ?? applicantDefaults?.phone ?? "",
      applicantAddressLine1:
        application?.applicantAddressLine1 ?? applicantDefaults?.address ?? "",
      applicantAddressLine2: application?.applicantAddressLine2 ?? "",
      applicantCity:
        application?.applicantCity ?? applicantDefaults?.city ?? "",
      applicantState:
        application?.applicantState ?? applicantDefaults?.state ?? "",
      applicantZipCode:
        application?.applicantZipCode ?? applicantDefaults?.zipCode ?? "",
      livingSituation:
        application?.livingSituation ?? household?.livingSituation,
      hasYard: toYesNo(application?.hasYard ?? household?.hasYard),
      landlordPermission: boolToSelectValue(
        application?.landlordPermission ?? household?.landlordPermission,
      ),
      hasChildren: toYesNo(application?.hasChildren ?? household?.hasChildren),
      householdSize:
        application?.householdSize ?? household?.householdSize ?? 1,
      childrenAges:
        application?.childrenAges?.join(", ") ??
        household?.childrenAges?.join(", ") ??
        "",
      otherAnimalsDescription:
        application?.otherAnimalsDescription ??
        household?.otherAnimalsDescription ??
        "",
      animalExperience:
        application?.animalExperience ?? household?.animalExperience ?? "",
      reasonForAdoption: application?.reasonForAdoption ?? "",
    },
  });

  
  
  const hasChildrenValue = useWatch({
    control: form.control,
    name: "hasChildren",
  });
  const livingSituation = useWatch({
    control: form.control,
    name: "livingSituation",
  });
  const renting = isRenting(livingSituation);

  
  
  const handleFormSubmit = (values: MyApplicationFormData) => {
    startSubmitTransition(async () => {
      const result = isEditMode
        ? await updateMyAdoptionApp(application.id, values)
        : await createMyAdoptionApp(animal.id, values);

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

  const isPublic = variant === "public";

  
  const intro = (
    <>
      Estás solicitando adoptar a {animal.name}, un maravilloso{" "}
      {animal.breeds.length > 0
        ? `${animal.breeds.map((b) => b.name).join(" / ")} (${
            animal.species.name
          })`
        : animal.species.name}
      .
    </>
  );

  return (
    <div className={isPublic ? undefined : "space-y-8 max-w-4xl mx-auto"}>
      
      {isPublic ? (
        
        
        <div className="mb-10 grid gap-7 sm:mb-14 lg:grid-cols-[0.8fr_minmax(0,1fr)] lg:gap-16">
          <div className="space-y-3 lg:col-start-2">
            <p className="max-w-[52ch] text-[16px] leading-[1.65] text-pretty text-organic-neutral-800">
              {intro}
            </p>
            <RequiredFieldsLegend />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Solicitud de adopción</CardTitle>
            <CardDescription>{intro}</CardDescription>
            <RequiredFieldsLegend />
          </CardHeader>
        </Card>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className={isPublic ? "space-y-10 sm:space-y-14" : "space-y-8"}
        >
          
          <FormSection
            variant={variant}
            step={1}
            title="Applicant Information"
            contentClassName="space-y-6"
          >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="applicantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicantEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicantPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="applicantAddressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Línea de dirección 1</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicantAddressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Línea de dirección 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apt, Suite, etc. (Optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="applicantCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="applicantState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Estado</FormLabel>
                        <Select
                          name={field.name}
                          autoComplete="address-level1"
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectContentClassName}>
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
                    control={form.control}
                    name="applicantZipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
          </FormSection>

          
          <FormSection
            variant={variant}
            step={2}
            title="Home & Lifestyle"
            contentClassName="space-y-8"
          >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="livingSituation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Situación de vivienda</FormLabel>
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tu situación de vivienda" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={selectContentClassName}>
                          {livingSituationOptions.map((option) => (
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
                
                <FormField
                  control={form.control}
                  name="householdSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tamaño del hogar</FormLabel>
                      <FormControl>
                        <NumberInput min={1} max={50} {...field} />
                      </FormControl>
                      <FormDescription>
                        Including yourself, how many people live in your home?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasYard"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      
                      <div id="hasYard-heading" className="text-sm font-medium">
                        Do you have a yard?
                        <span className="text-destructive"> *</span>
                      </div>
                      <FormControl>
                        <RadioGroup
                          aria-labelledby="hasYard-heading"
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="true" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="false" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {renting && (
                  <FormField
                    control={form.control}
                    name="landlordPermission"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <div id="landlordPermission-heading" className="text-sm font-medium">
                          Do you have landlord permission?
                          <span className="text-destructive"> *</span>
                        </div>
                        <FormControl>
                          <RadioGroup
                            aria-labelledby="landlordPermission-heading"
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                            className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <RadioGroupItem value="true" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Yes
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <RadioGroupItem value="false" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="hasChildren"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div id="hasChildren-heading" className="text-sm font-medium">
                        Are there children in the home?
                        <span className="text-destructive"> *</span>
                      </div>
                      <FormControl>
                        <RadioGroup
                          aria-labelledby="hasChildren-heading"
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="true" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="false" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                
                {hasChildrenValue === "true" && (
                  <FormField
                    control={form.control}
                    name="childrenAges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Edades de los hijos</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 5, 12, 15" {...field} />
                        </FormControl>
                        <FormDescription>
                          Please provide a comma-separated list of ages.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <Separator />
              <FormField
                control={form.control}
                name="otherAnimalsDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Otros animales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe other animals in the home (species, age, temperament, etc.)."
                        className="resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </FormSection>

          
          <FormSection
            variant={variant}
            step={3}
            title="Experience & Intent"
            contentClassName="space-y-8"
          >
              <FormField
                control={form.control}
                name="animalExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Animal Experience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your experience with animals, including past ownership."
                        className="resize-y min-h-25"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reasonForAdoption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Motivo de la adopción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Why do you want to adopt at this time? What are you looking for in a companion?"
                        className="resize-y min-h-25"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </FormSection>

          
          <div
            className={
              isPublic
                ? "flex flex-col-reverse gap-3 border-t border-border pt-10 sm:flex-row sm:justify-end sm:gap-4 sm:pt-14"
                : "flex justify-end space-x-4"
            }
          >
            <Button
              asChild
              variant="outline"
              type="button"
              disabled={isPending}
              className={
                isPublic
                  ? "h-auto justify-center rounded-full border-border px-[26px] py-[13px] font-display text-[15px] leading-[1.2] shadow-none hover:bg-foreground/[0.07]"
                  : undefined
              }
            >
              <Link href={cancelHref}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={
                isPublic
                  ? "h-auto justify-center rounded-full px-[26px] py-[13px] font-display text-[15px] leading-[1.2] hover:bg-organic-accent-600"
                  : undefined
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? isEditMode
                  ? "Updating..."
                  : "Enviando..."
                : isEditMode
                  ? "Actualizar solicitud"
                  : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
