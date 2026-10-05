export const AppPermissions = {
  
  ANIMAL_READ_ANALYTICS: "animal:read_analytics", 

  
  
  REPORTS_READ: "reports:read",

  
  INTAKE_READ: "intake:read",
  
  
  
  INTAKE_MANAGE: "intake:manage",

  
  OUTCOMES_READ: "outcomes:read",
  OUTCOMES_MANAGE: "outcomes:manage",
  
  
  
  
  OUTCOMES_REVERSE: "outcomes:reverse",

  
  ANIMAL_INFO_READ: "animal_info:read",
  ANIMAL_INFO_MANAGE: "animal_info:manage",

  
  ANIMAL_PHOTO_READ: "animal_photo:read",
  ANIMAL_PHOTO_MANAGE: "animal_photo:manage",

  
  ANIMAL_CHARACTERISTICS_READ: "animal_characteristics:read",
  ANIMAL_CHARACTERISTICS_MANAGE: "animal_characteristics:manage",

  ANIMAL_ACTIVITY_READ: "animal_activity:read",
  ANIMAL_JOURNEY_READ: "animal_journey:read",

  
  
  
  
  AI_ACTIVITY_READ: "ai_activity:read",

  
  ANIMAL_ASSESSMENT_READ: "animal_assessment:read",
  ANIMAL_ASSESSMENT_MANAGE: "animal_assessment:manage",

  
  ANIMAL_VITALS_READ: "animal_vitals:read",
  ANIMAL_VITALS_MANAGE: "animal_vitals:manage",

  
  ANIMAL_NOTE_READ: "animal_note:read",
  ANIMAL_NOTE_MANAGE: "animal_note:manage",

  
  ANIMAL_TASK_READ: "animal_task:read",
  ANIMAL_TASK_MANAGE: "animal_task:manage",

  
  
  
  
  
  
  
  AI_CHAT_USE: "ai_chat:use",

  
  PARTNERS_READ: "partners:read", 
  PARTNERS_MANAGE: "partners:manage",

  
  APPLICATIONS_READ: "applications:read", 
  APPLICATIONS_MANAGE_STATUS: "applications:manage_status", 

  
  MY_APPLICATIONS_READ: "my_applications:read",
  MY_APPLICATIONS_MANAGE: "my_applications:manage",

  
  PERSONS_READ: "persons:read", 
  PERSONS_MANAGE: "persons:manage",

  
  FOSTERS_READ: "fosters:read", 
  FOSTERS_MANAGE: "fosters:manage", 

  
  MY_FOSTER_APPLICATION_MANAGE: "my_foster_application:manage",
  MY_FOSTER_ANIMALS_READ: "my_foster_animals:read",

  MY_PROFILE_UPDATE: "my_profile:update", 

  
  MANAGE_ROLES: "user:manage_roles",

  
  
  
  
  
  
  
  
  PERSON_ACCOUNT_UNLINK: "person_account:unlink",
  
  
  MANAGE_CHARACTERISTICS_CATALOG: "characteristics_catalog:manage",
  MANAGE_ASSESSMENT_TEMPLATES: "assessment_templates:manage",
  MANAGE_ANIMAL_TAXONOMY: "animal_taxonomy:manage",
  MANAGE_LOCATIONS: "locations:manage",
} as const;

export type AppPermission =
  (typeof AppPermissions)[keyof typeof AppPermissions];