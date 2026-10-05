import { AppPermissions, type AppPermission } from "@/app/lib/auth/permissions";
import type { GlobalSearchPermission } from "@/app/lib/data/search/global-search";

export type IconName =
  | "IconDashboard"
  | "IconListDetails"
  | "IconUsers"
  | "IconFolder"
  | "IconClipboardList"
  | "IconFileAi"
  | "IconSettings"
  | "IconReport"
  | "IconFileWord"
  | "IconCirclePlus"
  | "IconFolder"
  | "IconChartBar"
  | "IconDashboard"
  | "IconListDetails"
  | "IconUsers"
  | "IconUsersGroup"
  | "IconHeartHandshake"
  | "IconFileText"
  | "IconChecks"
  | "IconCheckbox"
  | "IconBuildingStore"
  | "IconLayoutBoard"
  | "IconHomeHeart"
  | "IconClipboardHeart"
  | "IconDog"
  | "IconClipboardCheck"
  | "IconDoorEnter"

export interface NavItem {
  title: string;
  url: string;
  icon: IconName;
  
  permission?: AppPermission;
  
  anyPermissions?: readonly AppPermission[];
  isActive?: boolean;
  items?: Array<{
    title: string;
    url: string;
    permission?: AppPermission;
  }>;
}


export const SETTINGS_PERMISSIONS: readonly AppPermission[] = [
  AppPermissions.MANAGE_ROLES,
  AppPermissions.MANAGE_CHARACTERISTICS_CATALOG,
  AppPermissions.MANAGE_ANIMAL_TAXONOMY,
  AppPermissions.MANAGE_LOCATIONS,
  AppPermissions.AI_ACTIVITY_READ,
] as const;


export const SEARCH_PERMISSIONS = [
  AppPermissions.ANIMAL_INFO_READ,
  AppPermissions.PERSONS_READ,
  AppPermissions.PARTNERS_READ,
  AppPermissions.APPLICATIONS_READ,
  AppPermissions.FOSTERS_READ,
] as const satisfies readonly GlobalSearchPermission[];

export interface NavDocument {
  name: string;
  url: string;
  icon: IconName;
  permission?: AppPermission;
}


export const navMainItems: readonly NavItem[] = [
  {
    title: "Panel",
    url: "/dashboard",
    icon: "IconDashboard",
    permission: AppPermissions.ANIMAL_READ_ANALYTICS,
  },
  {
    title: "Mascotas",
    url: "/dashboard/animals",
    icon: "IconListDetails",
    permission: AppPermissions.ANIMAL_INFO_READ,
  },
  {
    title: "Tablero de preparación",
    url: "/dashboard/readiness",
    icon: "IconClipboardCheck",
    permission: AppPermissions.ANIMAL_ASSESSMENT_READ,
  },
  {
    title: "Directorio de personas",
    url: "/dashboard/people-directory",
    icon: "IconUsersGroup",
    permission: AppPermissions.PERSONS_READ,
  },
  {
    title: "Directorio de aliados",
    url: "/dashboard/partners-directory",
    icon: "IconBuildingStore",
    permission: AppPermissions.PARTNERS_READ,
  },
  {
    title: "Mis solicitudes de adopción",
    url: "/dashboard/my-adoption-applications",
    icon: "IconFileText",
    permission: AppPermissions.MY_APPLICATIONS_READ,
  },
  {
    title: "Mi solicitud de acogida",
    url: "/dashboard/my-foster-application",
    icon: "IconClipboardHeart",
    permission: AppPermissions.MY_FOSTER_APPLICATION_MANAGE,
  },
  {
    title: "Mis mascotas en acogida",
    url: "/dashboard/my-foster-animals",
    icon: "IconDog",
    permission: AppPermissions.MY_FOSTER_ANIMALS_READ,
  },
  {
    title: "Solicitudes de adopción",
    url: "/dashboard/adoption-applications",
    icon: "IconHeartHandshake",
    permission: AppPermissions.APPLICATIONS_READ,
  },
  {
    title: "Familias de acogida",
    url: "/dashboard/fosters",
    icon: "IconHomeHeart",
    permission: AppPermissions.FOSTERS_READ,
  },
  {
    title: "Solicitudes de acogida",
    url: "/dashboard/foster-applications",
    icon: "IconClipboardList",
    permission: AppPermissions.FOSTERS_READ,
  },
  {
    title: "Ingresos",
    url: "/dashboard/intakes",
    icon: "IconDoorEnter",
    permission: AppPermissions.INTAKE_READ,
  },
  {
    title: "Resultados",
    url: "/dashboard/outcomes",
    icon: "IconChecks",
    permission: AppPermissions.OUTCOMES_READ,
  },
  {
    title: "Informes",
    url: "/dashboard/reports",
    icon: "IconReport",
    permission: AppPermissions.REPORTS_READ,
  },
  {
    title: "Tareas de mascotas",
    url: "/dashboard/animal-tasks",
    icon: "IconCheckbox",
    permission: AppPermissions.ANIMAL_TASK_READ,
  },
  {
    title: "Tablero de alojamiento",
    url: "/dashboard/locations",
    icon: "IconLayoutBoard",
    permission: AppPermissions.ANIMAL_INFO_READ,
  },
] as const;

export const aiAssistantItem = {
  title: "Asistente de IA",
  url: "/dashboard/ai-chat",
  permission: AppPermissions.AI_CHAT_USE,
} as const;


export const navSecondaryItems: readonly NavItem[] = [
  {
    title: "Configuración",
    url: "/dashboard/settings",
    icon: "IconSettings",
    anyPermissions: SETTINGS_PERMISSIONS,
  },
] as const;


export const documentItems: readonly NavDocument[] = [] as const;
