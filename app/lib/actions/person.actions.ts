"use server";

import { getPhoneSearchSettings } from "@/app/lib/data/shelter-settings.data";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/client";
import prisma from "@/app/lib/prisma";
import { cuidSchema } from "../zod-schemas/common.schemas";
import {
  RequirePermission,
  SessionUser,
  withAuthenticatedUser,
} from "../auth/protected-actions";
import { AppPermissions } from "@/app/lib/auth/permissions";
import {
  PersonFormSchema,
  StaffPersonFormSchema,
  type PersonFormInput,
} from "../zod-schemas/people-directory.schemas";
import type { PersonPickerOption } from "../types";
import { fetchDuplicatePersonCandidate } from "../data/people-directory/people-directory.data";
import { z } from "zod";
import type { FieldErrors, FormResult } from "@/app/lib/action-result";
import { safeInternalPath } from "../utils/safe-redirect";
import { normalizePhone } from "../utils/phone";
import {
  findEmailConflict,
  syncPersonToUser,
} from "../services/user-person-sync";

const PEOPLE_DIRECTORY_PATH = "/dashboard/people-directory";

const personPath = (personId: string) => `${PEOPLE_DIRECTORY_PATH}/${personId}`;








export type DuplicateCandidate = {
  id: string;
  name: string;
  matchedOn: "email" | "phone";
  phone: string | null;
  email: string | null;
};

export type PersonDuplicateWarning = {
  ok: false;
  reason: "duplicate";
  message: string;
  duplicate: DuplicateCandidate;
};

export type PersonActionResult =
  | FormResult<PersonFormInput>
  | PersonDuplicateWarning;




type CreatePersonResult =
  | Extract<FormResult<PersonFormInput>, { ok: false }>
  | (Extract<FormResult<PersonFormInput>, { ok: true }> & {
      person: PersonPickerOption;
    })
  | PersonDuplicateWarning;



const toPersonData = (values: PersonFormInput) => ({
  name: values.name,
  email: values.email || null,
  phone: values.phone || null,
  address: values.address || null,
  city: values.city || null,
  state: values.state || null,
  zipCode: values.zipCode || null,
});




const findDuplicate = async (
  values: PersonFormInput,
  excludePersonId?: string,
): Promise<PersonDuplicateWarning | null> => {
  const duplicate = await fetchDuplicatePersonCandidate(
    values.email || null,
    values.phone || null,
    excludePersonId,
  );

  if (!duplicate) return null;

  const emailMatches =
    Boolean(values.email && duplicate.email?.toLowerCase() === values.email.toLowerCase());
  const country = (await getPhoneSearchSettings()).defaultPhoneCountry;
  const normalizedInputPhone = normalizePhone(values.phone, country);
  const normalizedDuplicatePhone = normalizePhone(duplicate.phone, country);
  const phoneMatches =
    Boolean(normalizedInputPhone && normalizedInputPhone === normalizedDuplicatePhone);

  const matchedOn: "email" | "phone" = emailMatches
    ? "email"
    : phoneMatches
      ? "phone"
      : "phone";

  return {
    ok: false,
    reason: "duplicate",
    
    
    message: `A person with this ${matchedOn} already exists.`,
    duplicate: {
      id: duplicate.id,
      name: duplicate.name,
      matchedOn,
      phone: duplicate.phone,
      email: duplicate.email,
    },
  };
};

const _createPerson = async (
  returnTo: string | null,
  confirmDuplicate: boolean,
  values: PersonFormInput,
): Promise<CreatePersonResult> => {
  const validatedFields = StaffPersonFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or invalid fields. Failed to create person.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<PersonFormInput>,
    };
  }

  if (!confirmDuplicate) {
    const duplicate = await findDuplicate(validatedFields.data);
    if (duplicate) return duplicate;
  }

  let person: PersonPickerOption;

  try {
    person = await prisma.person.create({
      data: toPersonData(validatedFields.data),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Failed to create person.",
        fieldErrors: { email: ["A person with this email already exists."] },
      };
    }
    console.error("Database Error creating person:", error);
    return {
      ok: false,
      message: "Database Error: Failed to create person.",
    };
  }

  revalidatePath(PEOPLE_DIRECTORY_PATH);

  return {
    ok: true,
    message: "Person created successfully.",
    person,
    
    
    redirectTo: safeInternalPath(returnTo, personPath(person.id)),
  };
};

const _updatePerson = async (
  personId: string,
  returnTo: string | null,
  confirmDuplicate: boolean,
  values: PersonFormInput,
): Promise<PersonActionResult> => {
  const parsedId = cuidSchema.safeParse(personId);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid person ID format." };
  }

  const validatedFields = StaffPersonFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or invalid fields. Failed to update person.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<PersonFormInput>,
    };
  }

  if (!confirmDuplicate) {
    const duplicate = await findDuplicate(validatedFields.data, parsedId.data);
    if (duplicate) return duplicate;
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  let existingPerson;
  try {
    existingPerson = await prisma.person.findUnique({
      where: { id: parsedId.data },
      select: {
        email: true,
        user: { select: { id: true, deactivatedAt: true } },
      },
    });
  } catch (error) {
    console.error("Database Error reading person before update:", error);
    return { ok: false, message: "Database Error: Failed to update person." };
  }
  if (!existingPerson) {
    return { ok: false, message: "Person not found." };
  }

  
  
  const requestedEmail = validatedFields.data.email?.trim().toLowerCase() || null;
  if (
    existingPerson.user &&
    !existingPerson.user.deactivatedAt &&
    requestedEmail !== existingPerson.email
  ) {
    return {
      ok: false,
      message: "Failed to update person.",
      fieldErrors: {
        email: [
          "This person has an account and signs in with this address. They can change it from their own profile.",
        ],
      },
    };
  }

  
  
  
  
  
  
  if (
    (await findEmailConflict(prisma, validatedFields.data.email, parsedId.data)) ===
    "user"
  ) {
    return {
      ok: false,
      message: "Failed to update person.",
      fieldErrors: {
        email: ["This email is already the sign-in address for another account."],
      },
    };
  }

  try {
    
    
    
    
    
    
    await prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: parsedId.data },
        data: toPersonData(validatedFields.data),
      });
      await syncPersonToUser(tx, parsedId.data, validatedFields.data);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Failed to update person.",
        fieldErrors: { email: ["This email is already in use."] },
      };
    }
    console.error("Database Error updating person:", error);
    return {
      ok: false,
      message: "Database Error: Failed to update person.",
    };
  }

  revalidatePath(PEOPLE_DIRECTORY_PATH);
  revalidatePath(personPath(parsedId.data));

  return {
    ok: true,
    message: "Person updated successfully.",
    redirectTo: safeInternalPath(returnTo, personPath(parsedId.data)),
  };
};

const _updateMyProfile = async (
  user: SessionUser,
  values: PersonFormInput,
): Promise<FormResult<PersonFormInput>> => {
  const personId = user.personId;

  const validatedFields = PersonFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      ok: false,
      message: "Missing or invalid fields. Failed to update profile.",
      fieldErrors: z.flattenError(validatedFields.error)
        .fieldErrors as FieldErrors<PersonFormInput>,
    };
  }

  
  
  
  
  const conflict = await findEmailConflict(
    prisma,
    validatedFields.data.email,
    personId,
  );
  if (conflict) {
    return {
      ok: false,
      message: "Failed to update profile.",
      fieldErrors: {
        email: [
          conflict === "person"
            ? "A person with this email already exists."
            : "This email is already the sign-in address for another account.",
        ],
      },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: personId },
        data: toPersonData(validatedFields.data),
      });
      
      
      
      await syncPersonToUser(tx, personId, validatedFields.data);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        
        
        return {
          ok: false,
          message: "Failed to update profile.",
          fieldErrors: { email: ["This email is already in use."] },
        };
      }
      if (error.code === "P2025") {
        return { ok: false, message: "Profile not found." };
      }
    }
    console.error("Database Error updating profile:", error);
    return {
      ok: false,
      message: "Database Error: Failed to update profile.",
    };
  }

  revalidatePath("/dashboard/account");
  return { ok: true, message: "Profile updated successfully." };
};

export const updateMyProfile = withAuthenticatedUser(
  RequirePermission(AppPermissions.MY_PROFILE_UPDATE)(_updateMyProfile),
);

export const createPerson = RequirePermission(AppPermissions.PERSONS_MANAGE)(
  _createPerson,
);

export const updatePerson = RequirePermission(AppPermissions.PERSONS_MANAGE)(
  _updatePerson,
);
