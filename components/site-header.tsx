"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchTrigger } from "@/components/dashboard/search/search-trigger";
import { ThemeToggle } from "./light-dark-theme/theme-toggle";




const TITLE_OVERRIDES: Record<string, string> = {
  "ai-chat": "Asistente de IA",
  dashboard: "Panel",
  animals: "Mascotas",
  readiness: "Tablero de preparación",
  "people-directory": "Directorio de personas",
  "partners-directory": "Directorio de aliados",
  "my-adoption-applications": "Mis solicitudes de adopción",
  "my-foster-application": "Mi solicitud de acogida",
  "my-foster-animals": "Mis mascotas en acogida",
  "adoption-applications": "Solicitudes de adopción",
  fosters: "Familias de acogida",
  "foster-applications": "Solicitudes de acogida",
  intakes: "Ingresos",
  outcomes: "Resultados",
  reports: "Informes",
  "animal-tasks": "Tareas de mascotas",
  locations: "Ubicaciones",
  settings: "Configuración",
};


const formatTitle = (s: string) => {
  if (typeof s !== 'string' || s.length === 0) {
    return '';
  }
  if (TITLE_OVERRIDES[s]) {
    return TITLE_OVERRIDES[s];
  }
  
  
  
  return s
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function SiteHeader() {
  const pathname = usePathname(); 
  const segments = pathname.split('/').filter(Boolean); 

  let title = "Dashboard"; 

  
  if (segments[0] === 'dashboard' && segments.length > 1) {
    title = formatTitle(segments[1]);
  } else if (segments.length > 0) {
    title = formatTitle(segments[0]);
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
