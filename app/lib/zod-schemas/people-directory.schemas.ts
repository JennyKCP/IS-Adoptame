import { z } from "zod";
import {
  currentPageSchema,
  optionalUsStateSchema,
  pageSizeSchema,
  searchQuerySchema,
} from "./common.schemas";

export const PeopleDirectoryParamsSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  sort: z.string().optional(),
  pageSize: pageSizeSchema,
  account: z.string().optional(),
});

export const PersonFormSchema = z.object({
  name: z.string().min(1, {
    error: "Name is required.",
  }),
  email: z
    .email({ error: "Please enter a valid email address." })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: optionalUsStateSchema,
  zipCode: z.string().optional(),
});

export type PersonFormInput = z.input<typeof PersonFormSchema>;







export const StaffPersonFormSchema = PersonFormSchema.superRefine(
  (data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: "custom",
        message: "Provide an email or phone number so this person can be contacted.",
        path: ["email"],
      });
    }
  },
);

export const PersonNotesParamsSchema = z.object({
  currentPage: currentPageSchema,
  sort: z.string().optional(),
  status: z.string().optional(),
});

export const PersonNoteFormSchema = z.object({
  content: z.string().min(1, { error: "Content cannot be empty." }),
});