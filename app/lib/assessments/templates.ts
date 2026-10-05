import { FieldType } from "@/prisma/generated/enums";



export interface AssessmentTemplateFieldDef {
  
  key: string;
  label: string;
  fieldType: FieldType;
  
  options?: string[];
  
  concerningValues?: string[];
  isRequired?: boolean;
  
  proposesCharacteristic?: string;
  
  proposesOnValues?: string[];
}

export interface AssessmentTemplateDef {
  
  key: string;
  version: number;
  name: string;
  description: string;
  
  species?: string;
  
  stage?: string;
  
  isActive?: boolean;
  fields: AssessmentTemplateFieldDef[];
}

const notes: AssessmentTemplateFieldDef = {
  key: "notes",
  label: "Notes",
  fieldType: FieldType.LONG_TEXT,
};

export const ASSESSMENT_TEMPLATES: AssessmentTemplateDef[] = [
  {
    key: "INTAKE_MEDICAL",
    version: 1,
    name: "Intake Medical",
    description:
      "First-pass physical check performed at or shortly after intake for every animal.",
    stage: "intake",
    
    
    
    
    fields: [
      {
        key: "dental",
        label: "Dental",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Normal",
          "Mild tartar",
          "Moderate disease",
          "Severe disease",
        ],
        concerningValues: ["Severe disease"],
        isRequired: true,
      },
      {
        key: "parasites",
        label: "External parasites",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["None seen", "Fleas", "Ticks", "Ear mites", "Treated"],
        concerningValues: ["Fleas", "Ticks", "Ear mites"],
      },
      {
        key: "heart_lungs",
        label: "Heart & lungs on auscultation",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Clear", "Murmur", "Increased respiratory effort"],
        concerningValues: ["Murmur", "Increased respiratory effort"],
        isRequired: true,
      },
      notes,
    ],
  },
  {
    key: "INTAKE_BEHAVIORAL",
    version: 1,
    name: "Intake Behavioral",
    description:
      "Baseline behavioral read taken in the first few days: kennel presence, handling, and resource behavior.",
    stage: "intake",
    fields: [
      {
        key: "kennel_presence",
        label: "Kennel presence",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Relaxed",
          "Alert",
          "Anxious",
          "Barrier reactive",
          "Shut down",
        ],
        concerningValues: ["Barrier reactive", "Shut down"],
        isRequired: true,
      },
      {
        key: "handler_sociability",
        label: "Sociability with handler",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Solicits attention", "Neutral", "Avoidant", "Fearful"],
        concerningValues: ["Fearful"],
      },
      {
        key: "food_guarding",
        label: "Food guarding (high-value item)",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["None", "Stiffens", "Growls", "Snaps"],
        concerningValues: ["Growls", "Snaps"],
      },
      {
        key: "body_handling",
        label: "Tolerance of body handling",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Tolerates all",
          "Tolerates most",
          "Pulls away",
          "Bites or attempts to",
        ],
        concerningValues: ["Bites or attempts to"],
      },
      {
        key: "arousal_recovery",
        label: "Recovery from arousal",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Quick", "Moderate", "Slow"],
        concerningValues: ["Slow"],
      },
      notes,
    ],
  },
  {
    key: "CAT_TEST",
    version: 1,
    name: "Cat Test",
    description:
      "Structured introduction of a dog to a calm cat behind a barrier, then at controlled proximity.",
    species: "Dog",
    stage: "adoption-prep",
    fields: [
      {
        key: "visual_response",
        label: "Response on first seeing the cat",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Ignores", "Curious and calm", "Fixated", "Lunges or barks"],
        concerningValues: ["Fixated", "Lunges or barks"],
        isRequired: true,
      },
      {
        key: "proximity_response",
        label: "Response at close proximity",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Calm",
          "Mild interest",
          "Overstimulated",
          "Predatory (stalk, hard stare, lunge)",
        ],
        concerningValues: [
          "Overstimulated",
          "Predatory (stalk, hard stare, lunge)",
        ],
        isRequired: true,
      },
      {
        key: "recovery",
        label: "Redirects away from the cat when asked",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Redirects easily",
          "Redirects with effort",
          "Cannot redirect",
        ],
        concerningValues: ["Cannot redirect"],
      },
      {
        key: "recommendation",
        label: "Recommendation",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Cat-safe",
          "Cat-tolerant with management",
          "Not cat-safe",
          "Inconclusive — retest",
        ],
        concerningValues: ["Not cat-safe"],
        proposesCharacteristic: "Good with cats",
        proposesOnValues: ["Cat-safe"],
        isRequired: true,
      },
      notes,
    ],
  },
  {
    key: "DOG_INTRO",
    version: 1,
    name: "Dog-to-Dog Introduction",
    description:
      "Parallel walk and, if it goes well, an on-leash then off-leash greeting with a stable helper dog.",
    species: "Dog",
    stage: "adoption-prep",
    fields: [
      {
        key: "greeting_style",
        label: "Greeting style",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Loose and social",
          "Tense",
          "Avoidant",
          "Over-the-top but not aggressive",
        ],
        concerningValues: ["Tense"],
        isRequired: true,
      },
      {
        key: "play_style",
        label: "Play style",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Appropriate, takes breaks",
          "Rude but recovers",
          "Bullying",
          "No interest in play",
        ],
        concerningValues: ["Bullying"],
      },
      {
        key: "correction_response",
        label: "Response to a correction from the other dog",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Defers appropriately", "Freezes", "Escalates"],
        concerningValues: ["Escalates"],
      },
      {
        key: "resource_around_dogs",
        label: "Resource behavior around other dogs",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Neutral", "Guards from dogs", "Not tested"],
        concerningValues: ["Guards from dogs"],
      },
      {
        key: "recommendation",
        label: "Recommendation",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Dog-social",
          "Dog-selective",
          "Needs slow introductions",
          "Solo-dog home",
        ],
        concerningValues: ["Solo-dog home"],
        proposesCharacteristic: "Good with other dogs",
        proposesOnValues: ["Dog-social"],
        isRequired: true,
      },
      notes,
    ],
  },
  {
    key: "HANDLING",
    version: 1,
    name: "Handling Sensitivity",
    description:
      "How the animal tolerates the routine handling that daily shelter care and a vet visit require.",
    fields: [
      {
        key: "collar_leash",
        label: "Collar and leash application",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Accepts readily",
          "Accepts with time",
          "Resists",
          "Panics",
        ],
        concerningValues: ["Panics"],
        isRequired: true,
      },
      {
        key: "restraint",
        label: "Gentle restraint for exam",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Relaxed", "Tolerates", "Struggles", "Freezes or panics"],
        concerningValues: ["Freezes or panics"],
      },
      {
        key: "paws_nails",
        label: "Paw handling / nail trim",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "No concern",
          "Mild pull-away",
          "Strong pull-away",
          "Snaps",
        ],
        concerningValues: ["Snaps"],
      },
      {
        key: "ears_mouth",
        label: "Ear and mouth handling",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "No concern",
          "Mild avoidance",
          "Strong avoidance",
          "Snaps",
        ],
        concerningValues: ["Snaps"],
      },
      {
        key: "overall_sensitivity",
        label: "Overall handling sensitivity",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Low", "Moderate", "High"],
        concerningValues: ["High"],
        isRequired: true,
      },
      notes,
    ],
  },
  {
    key: "DAILY_ROUNDS",
    version: 1,
    name: "Daily Rounds",
    description:
      "The fast once-per-day kennel check — appetite, elimination, energy, and stress. Filled from the Rounds screen (Step 10).",
    stage: "in-care",
    fields: [
      {
        key: "appetite",
        label: "Appetite",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Normal", "Reduced", "Not eating"],
        concerningValues: ["Not eating"],
        isRequired: true,
      },
      {
        key: "stool",
        label: "Stool",
        fieldType: FieldType.SINGLE_SELECT,
        options: [
          "Normal",
          "Soft",
          "Diarrhea",
          "Blood present",
          "Not observed",
        ],
        concerningValues: ["Diarrhea", "Blood present"],
      },
      {
        key: "energy",
        label: "Energy",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Bright", "Quiet", "Lethargic"],
        concerningValues: ["Lethargic"],
        isRequired: true,
      },
      {
        key: "respiratory",
        label: "Respiratory",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Normal", "Sneezing", "Coughing", "Labored"],
        concerningValues: ["Coughing", "Labored"],
      },
      {
        key: "demeanor",
        label: "Demeanor",
        fieldType: FieldType.SINGLE_SELECT,
        options: ["Comfortable", "Mild stress", "High stress"],
        concerningValues: ["High stress"],
      },
      { key: "notes", label: "Notes", fieldType: FieldType.SHORT_TEXT },
    ],
  },
];

const SELECT_TYPES: FieldType[] = [
  FieldType.SINGLE_SELECT,
  FieldType.MULTI_SELECT,
];


export function validateRegistry(
  templates: readonly AssessmentTemplateDef[] = ASSESSMENT_TEMPLATES,
): string[] {
  const errors: string[] = [];
  const seenKeyVersions = new Set<string>();

  for (const template of templates) {
    const kv = `${template.key}@${template.version}`;
    if (seenKeyVersions.has(kv)) {
      errors.push(`duplicate template (key, version): ${kv}`);
    }
    seenKeyVersions.add(kv);

    if (template.version < 1 || !Number.isInteger(template.version)) {
      errors.push(`${kv}: version must be a positive integer`);
    }
    if (template.fields.length === 0) {
      errors.push(`${kv}: has no fields`);
    }

    const seenFieldKeys = new Set<string>();
    
    
    
    const proposerByTrait = new Map<string, string>();
    for (const field of template.fields) {
      const ref = `${kv} field "${field.key}"`;
      if (seenFieldKeys.has(field.key)) {
        errors.push(`${ref}: duplicate field key`);
      }
      seenFieldKeys.add(field.key);

      if (field.proposesCharacteristic) {
        const other = proposerByTrait.get(field.proposesCharacteristic);
        if (other !== undefined) {
          errors.push(
            `${ref}: proposes "${field.proposesCharacteristic}", which field "${other}" already proposes`,
          );
        } else {
          proposerByTrait.set(field.proposesCharacteristic, field.key);
        }
      }

      const isSelect = SELECT_TYPES.includes(field.fieldType);
      const options = field.options ?? [];

      if (isSelect && options.length === 0) {
        errors.push(`${ref}: ${field.fieldType} requires options`);
      }
      if (!isSelect && options.length > 0) {
        errors.push(`${ref}: ${field.fieldType} must not declare options`);
      }
      if (new Set(options).size !== options.length) {
        errors.push(`${ref}: options contains duplicates`);
      }

      for (const value of field.concerningValues ?? []) {
        if (!options.includes(value)) {
          errors.push(
            `${ref}: concerningValue "${value}" is not one of the field's options`,
          );
        }
      }

      const proposesOn = field.proposesOnValues ?? [];
      if (field.proposesCharacteristic && proposesOn.length === 0) {
        errors.push(
          `${ref}: proposesCharacteristic is set but proposesOnValues is empty`,
        );
      }
      if (!field.proposesCharacteristic && proposesOn.length > 0) {
        errors.push(
          `${ref}: proposesOnValues is set without a proposesCharacteristic`,
        );
      }
      if (
        field.proposesCharacteristic &&
        field.fieldType !== FieldType.SINGLE_SELECT
      ) {
        errors.push(
          `${ref}: only SINGLE_SELECT fields can propose a characteristic`,
        );
      }
      for (const value of proposesOn) {
        if (!options.includes(value)) {
          errors.push(
            `${ref}: proposesOnValue "${value}" is not one of the field's options`,
          );
        }
        if ((field.concerningValues ?? []).includes(value)) {
          errors.push(
            `${ref}: proposesOnValue "${value}" is also a concerningValue — a finding cannot both affirm and contradict a trait`,
          );
        }
      }
    }
  }

  return errors;
}


export function getActiveTemplate(
  key: string,
  templates: readonly AssessmentTemplateDef[] = ASSESSMENT_TEMPLATES,
): AssessmentTemplateDef | undefined {
  return templates
    .filter((t) => t.key === key && t.isActive !== false)
    .sort((a, b) => b.version - a.version)[0];
}
