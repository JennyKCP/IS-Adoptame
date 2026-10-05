import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Authorize } from "@/components/auth/authorize";
import StatusPage from "@/components/StatusPage";
import { AppPermissions, type AppPermission } from "@/app/lib/auth/permissions";
import { hasAnyPermission } from "@/app/lib/getFilteredLinks";
import { SETTINGS_PERMISSIONS } from "@/components/dashboard/nav/nav-links.config";

interface SettingsCard {
    title: string;
    description: string;
    url: string;
    permission: AppPermission;
}



const settingsCards: readonly SettingsCard[] = [
    {
        title: "Gestión de roles",
        description: "Administra los roles y permisos del refugio.",
        url: "/dashboard/settings/role-management",
        permission: AppPermissions.MANAGE_ROLES,
    },
    {
        title: "Características",
        description:
            "Administra las etiquetas utilizadas para describir mascotas, como rasgos de comportamiento, médicos y ambientales.",
        url: "/dashboard/settings/characteristics",
        permission: AppPermissions.MANAGE_CHARACTERISTICS_CATALOG,
    },
    {
        title: "Taxonomía de mascotas",
        description:
            "Administra las especies, razas y colores utilizados para describir mascotas.",
        url: "/dashboard/settings/animal-taxonomy",
        permission: AppPermissions.MANAGE_ANIMAL_TAXONOMY,
    },
    {
        title: "Ubicaciones",
        description:
            "Administra las ubicaciones y unidades del refugio.",
        url: "/dashboard/settings/locations",
        permission: AppPermissions.MANAGE_LOCATIONS,
    },
    {
        title: "Actividad de IA",
        description:
            "Revisa los cambios realizados por el asistente en los datos del refugio y deshazlos.",
        url: "/dashboard/settings/ai-activity",
        permission: AppPermissions.AI_ACTIVITY_READ,
    },
] as const;

const Page = async () => {
    
    
    
    
    const allowed = await hasAnyPermission(SETTINGS_PERMISSIONS);

    if (!allowed) {
        return <StatusPage type="accessDenied" />;
    }

    return <PageContent />;
};

const PageContent = async () => {
    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle className="@[650px]/card:text-xl">Configuración</CardTitle>
                <CardDescription>
                    Configura las opciones generales de tu refugio.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {settingsCards.map((card) => (
                        <Authorize
                            key={card.url}
                            permission={card.permission}
                            fallback={null}
                        >
                            <Link href={card.url} className="group">
                                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                                    <CardHeader>
                                        <CardTitle className="text-base">{card.title}</CardTitle>
                                        <CardDescription>{card.description}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </Authorize>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default Page;
