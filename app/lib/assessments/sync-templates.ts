import { FieldType } from "@/prisma/generated/enums";
import {
  ASSESSMENT_TEMPLATES,
  validateRegistry,
  type AssessmentTemplateDef,
} from "./templates";


export interface TemplateRegistryStore {
  
  upsertTemplate(input: TemplateUpsert): Promise<{ id: string }>;
  
  upsertField(input: FieldUpsert): Promise<void>;
  
  findProposedCharacteristicId(
    templateId: string,
    key: string,
  ): Promise<string | null>;
  
  resolveCharacteristicId(name: string): Promise<string | null>;
}

export interface TemplateUpsert {
  key: string;
  version: number;
  name: string;
  description: string;
  species: string | null;
  stage: string | null;
  isActive: boolean;
}

export interface FieldUpsert {
  templateId: string;
  key: string;
  label: string;
  fieldType: FieldType;
  options: string[];
  concerningValues: string[];
  isRequired: boolean;
  
  order: number;
  
  proposesCharacteristicId: string | null;
  proposesOnValues: string[];
}

export interface SyncResult {
  templates: number;
  fields: number;
}


export async function syncTemplateRegistry(
  store: TemplateRegistryStore,
  templates: readonly AssessmentTemplateDef[] = ASSESSMENT_TEMPLATES,
): Promise<SyncResult> {
  const problems = validateRegistry(templates);
  if (problems.length > 0) {
    throw new Error(
      `Assessment template registry is invalid:\n  - ${problems.join("\n  - ")}`,
    );
  }

  let fieldCount = 0;

  for (const template of templates) {
    const { id } = await store.upsertTemplate({
      key: template.key,
      version: template.version,
      name: template.name,
      description: template.description,
      species: template.species ?? null,
      stage: template.stage ?? null,
      isActive: template.isActive ?? true,
    });

    for (const [order, field] of template.fields.entries()) {
      let proposesCharacteristicId: string | null = null;
      if (field.proposesCharacteristic) {
        proposesCharacteristicId =
          (await store.findProposedCharacteristicId(id, field.key)) ??
          (await store.resolveCharacteristicId(field.proposesCharacteristic));
        if (!proposesCharacteristicId) {
          throw new Error(
            `Assessment template "${template.key}@${template.version}" field "${field.key}" proposes characteristic "${field.proposesCharacteristic}", which is not in the catalog.`,
          );
        }
      }

      await store.upsertField({
        templateId: id,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        options: field.options ?? [],
        concerningValues: field.concerningValues ?? [],
        isRequired: field.isRequired ?? false,
        order,
        proposesCharacteristicId,
        proposesOnValues: field.proposesOnValues ?? [],
      });
      fieldCount += 1;
    }
  }

  return { templates: templates.length, fields: fieldCount };
}
