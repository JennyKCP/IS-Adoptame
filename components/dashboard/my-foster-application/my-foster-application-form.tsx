"use client";

import { useTransition } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { US_STATES } from "@/app/lib/constants/us-states";
import { boolToSelectValue } from "@/app/lib/utils/form-utils";
import { createMyFosterApplication } from "@/app/lib/actions/foster-application.actions";
import { applyFieldErrors } from "@/app/lib/utils/form-result-utils";
import { FosterApplicationFormSchema } from "@/app/lib/zod-schemas/foster.schemas";
import {
  HouseholdFormFields,
  HouseholdProfileFormValues,
} from "@/components/dashboard/household/household-fields";
import { FosterCapabilityFormFields } from "./foster-capability-form-fields";
import { FosterApplicantDefaultsPayload } from "@/app/lib/data/fosters/my-foster-application.data";

type FosterApplicationFormValues = z.input<typeof FosterApplicationFormSchema>;

interface MyFosterApplicationFormProps {
  applicantDefaults?: FosterApplicantDefaultsPayload | null;
  species: { id: string; name: string }[];
}

export function MyFosterApplicationForm({
  applicantDefaults,
  species,
}: MyFosterApplicationFormProps) {
  const [isPending, startSubmitTransition] = useTransition();

  const household = applicantDefaults?.householdProfile;

  const form = useForm<FosterApplicationFormValues>({
    resolver: standardSchemaResolver(FosterApplicationFormSchema),
    defaultValues: {
      applicantName: applicantDefaults?.name ?? "",
      applicantEmail: applicantDefaults?.email ?? "",
      applicantPhone: applicantDefaults?.phone ?? "",
      applicantAddressLine1: applicantDefaults?.address ?? "",
      applicantAddressLine2: "",
      applicantCity: applicantDefaults?.city ?? "",
      applicantState: applicantDefaults?.state ?? "",
      applicantZipCode: applicantDefaults?.zipCode ?? "",
      livingSituation: household?.livingSituation ?? undefined,
      hasYard: boolToSelectValue(household?.hasYard),
      landlordPermission: boolToSelectValue(household?.landlordPermission),
      hasChildren: boolToSelectValue(household?.hasChildren),
      householdSize: household?.householdSize ?? 1,
      childrenAges: household?.childrenAges?.join(", ") || "",
      otherAnimalsDescription: household?.otherAnimalsDescription || "",
      animalExperience: household?.animalExperience || "",
      speciesIds: [],
      maxAnimals: 1,
      hasQuarantineSpace: undefined,
      canGiveOralMeds: undefined,
      canBottleFeed: undefined,
      canTransport: undefined,
      acceptsMedical: undefined,
      acceptsHospice: undefined,
      availabilityNotes: "",
    },
  });

  
  
  
  
  
  
  
  
  
  
  const onSubmit = (values: FosterApplicationFormValues) => {
    startSubmitTransition(async () => {
      const result = await createMyFosterApplication(values);

      if (result.ok) {
        toast.success(result.message);
        form.reset(values);
        return;
      }

      applyFieldErrors(form, result.fieldErrors);
      toast.error(result.message);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <RequiredFieldsLegend />
        <Card>
          <CardHeader>
            <CardTitle>Información del solicitante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                    <FormLabel required>Email</FormLabel>
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
                    <FormLabel required>Dirección, línea 1</FormLabel>
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
                    <FormLabel>Dirección, línea 2</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Apto., suite, etc. (opcional)"
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
                  control={form.control}
                  name="applicantZipCode"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel required>Código postal</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hogar y estilo de vida</CardTitle>
            <CardDescription>
              Estos datos vienen de tu perfil; actualiza cualquier información
              que haya cambiado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            
            <HouseholdFormFields
              form={
                form as unknown as UseFormReturn<HouseholdProfileFormValues>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacidades para la acogida</CardTitle>
            <CardDescription>
              Cuéntanos qué tipo de acogida puedes ofrecer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            <FosterCapabilityFormFields form={form} species={species} />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
