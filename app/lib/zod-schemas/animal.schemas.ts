import { z } from "zod";
import { calendarDaySchema } from "./common.schemas";
import type { CalendarDay } from "../utils/shelter-day";
import {
  Sex,
  AnimalSize,
  AnimalHealthStatus,
  TaskStatus,
  TaskCategory,
  TaskPriority,
  NoteCategory,
  AnimalListingStatus,
} from "@/prisma/generated/enums";
import {
  cuidSchema,
  currentPageSchema,
  pageSizeSchema,
  searchQuerySchema,
} from "./common.schemas";
import { intakeFieldsShape, intakeSuperRefine } from "./intake.schema";

const speciesNameSchema = z
  .string()
  .max(50, {
    error: "Species name must be at most 50 characters long.",
  })
  .optional();



const colorParamSchema = z
  .string()
  .max(200, {
    error: "Color filter is too long.",
  })
  .optional();



const facetParamSchema = z
  .string()
  .max(100, {
    error: "Filter value is too long.",
  })
  .optional();

export const sortSchema = z
  .string()
  .regex(/^\w+\.(asc|desc)$/, {
    error: "Sort must be in 'field.direction' format",
  })
  .optional();

export const PublishedPetsSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  speciesName: speciesNameSchema,
  color: colorParamSchema,
  sex: facetParamSchema,
  size: facetParamSchema,
  sort: sortSchema,
});

export const MyAdoptionApplicationsSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  sort: sortSchema,
  status: z.string().optional(),
  pageSize: pageSizeSchema,
});

export const DashboardAnimalsSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  listingStatus: z.string().optional(),
  sex: z.string().optional(),
  pageSize: pageSizeSchema,
  sort: z.string().optional(),
});

export const AnimalTasksSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  category: z.string().optional(),
  status: z.string().optional(),
  pageSize: pageSizeSchema,
  sort: z.string().optional(),
  animalId: cuidSchema,
});





const animalFieldsShape = {
  animalName: z.string().min(1, {
    error: "Animal name is required.",
  }),
  species: z.cuid2({
    error: "A valid species ID is required.",
  }),
  breed: z.cuid2({
    error: "A valid primary breed ID is required.",
  }),
  primaryColor: z.cuid2({
    error: "A valid primary color ID is required.",
  }),
  additionalColors: z
    .array(z.cuid2({ error: "A valid color ID is required." }))
    .optional()
    .default([]),
  sex: z.enum(Sex, {
    error: (issue) =>
      issue.input === undefined ? "Sex is required." : undefined,
  }),
  
  
  
  size: z.enum(AnimalSize).optional().or(z.literal("")),
  estimatedBirthDate: calendarDaySchema("Estimated birth date"),
  healthStatus: z.enum(AnimalHealthStatus, {
    error: (issue) =>
      issue.input === undefined ? "Health status is required." : undefined,
  }),
  listingStatus: z.enum(AnimalListingStatus, {
    error: (issue) =>
      issue.input === undefined ? "Listing status is required." : undefined,
  }),
  heightCm: z
    .number()
    .positive({ error: "Height must be a positive number." })
    .nullable(),
  microchipNumber: z.string().optional(),
  
  
  
  
  isSpayedNeutered: z.boolean(),
  description: z.string().optional(),
  
  
  currentUnitId: z.cuid2().optional().or(z.literal("")),
};



const animalColorSuperRefine = (
  data: { primaryColor: string; additionalColors: string[] },
  ctx: z.RefinementCtx,
) => {
  if (data.additionalColors.includes(data.primaryColor)) {
    ctx.addIssue({
      code: "custom",
      message:
        "The primary color shouldn't be repeated in additional colors.",
      path: ["additionalColors"],
    });
  }
};







const weightGramsShape = {
  
  weightGrams: z
    .number()
    .int({ error: "Weight must be a whole number of grams." })
    .positive({ error: "Weight must be a positive number." })
    .nullable(),
};











export const CreateAnimalFormSchema = z
  .object({
    ...animalFieldsShape,
    
    
    listingStatus: animalFieldsShape.listingStatus.refine(
      (status) =>
        status === AnimalListingStatus.DRAFT ||
        status === AnimalListingStatus.PUBLISHED,
      { error: "A new animal can only be a draft or published." },
    ),
    ...weightGramsShape,
    ...intakeFieldsShape,
  })
  .superRefine((data, ctx) => {
    animalColorSuperRefine(data, ctx);
    intakeSuperRefine(data, ctx);
  });

export const AnimalEditFormSchema = z
  .object({ ...animalFieldsShape })
  .superRefine(animalColorSuperRefine);

export type CreateAnimalFormInput = z.input<typeof CreateAnimalFormSchema>;
export type CreateAnimalFormOutput = z.output<typeof CreateAnimalFormSchema>;
export type AnimalEditFormInput = z.input<typeof AnimalEditFormSchema>;

export const TaskFormSchema = z.object({
  title: z.string().min(1, {
    error: "Title is required.",
  }),
  details: z.string().optional(),
  status: z.enum(TaskStatus).optional(),
  category: z.enum(TaskCategory, {
    error: (issue) =>
      issue.input === undefined ? "Category is required." : undefined,
  }),
  priority: z.enum(TaskPriority).optional(),

  
  
  
  dueDate: calendarDaySchema("A due date").nullish(),

  assigneeId: z
    .cuid2({
      error: "Valid assignee ID is required.",
    })
    .optional(),
});
 

export const createTaskFormSchema = (today: CalendarDay) =>
  TaskFormSchema.refine((data) => !data.dueDate || data.dueDate >= today, {
    path: ["dueDate"],
    error: "Due date cannot be in the past.",
  });

export const NoteFormSchema = z.object({
  category: z.enum(NoteCategory),
  content: z.string().min(1, {
    error: "Content cannot be empty.",
  }),
});

export type TaskFormInput = z.input<typeof TaskFormSchema>;