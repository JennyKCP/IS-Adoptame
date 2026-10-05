"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Info,
  LayoutDashboard,
  Mail,
  Menu as Bars3Icon,
  PawPrint,
  Heart as HeartIcon,
  type LucideIcon,
} from "lucide-react";
import { IconPaw } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NavItemsRenderer from "./nav-items-renderer";
import UserMenu from "./top-nav-user-avatar";

interface NavLink {
  name: string;
  href: string;
}

interface TopNavProps {
  userImage: string | null | undefined;
  showUserProfile: boolean;
  links: NavLink[];
}

const FAVORITES_HREF = "/pets/favorites";

interface MobileTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const TopNav = ({ userImage, showUserProfile, links }: TopNavProps) => {
  const pathname = usePathname();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileTabs: MobileTab[] = [
    { label: "Inicio", href: "/", icon: House },
    { label: "Mascotas", href: "/pets", icon: PawPrint },
    { label: "Nosotros", href: "/about", icon: Info },
    { label: "Contacto", href: "/contact", icon: Mail },
    showUserProfile
      ? {
          label: "Panel",
          href:
            links.find((link) => link.name === "Panel")?.href ??
            "/dashboard",
          icon: LayoutDashboard,
        }
      : { label: "Iniciar sesión", href: "/sign-in", icon: LayoutDashboard },
  ];

  const isTabActive = (href: string) =>
    href === "/"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    
    
    
    
    
    <header className="relative z-20 bg-organic-accent-100 px-5 py-[22px] sm:px-8 lg:px-14">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-x-4">
        
        <div className="hidden items-center sm:flex min-[915px]:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 hover:bg-accent hover:text-accent-foreground"
              >
                <span className="sr-only">Abrir menú principal</span>
                <Bars3Icon className="block size-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            
            <SheetContent
              side="left"
              className="theme-organic gap-6 border-r-border bg-popover p-4 text-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menú</SheetTitle>
                <SheetDescription>
                  Menú de navegación móvil con enlaces a las distintas secciones
                  del sitio web.
                </SheetDescription>
              </SheetHeader>

              
              <div className="flex shrink-0 items-center gap-[11px]">
                <span className="grid size-[38px] place-items-center rounded-full bg-primary">
                  <IconPaw className="size-5 text-background" />
                </span>
                <span className="font-display text-[20px]">Adoptame</span>
              </div>

              
              <div className="flex flex-col gap-1">
                <NavItemsRenderer
                  links={links}
                  pathname={pathname}
                  showUserProfile={showUserProfile}
                  onLinkClick={() => setIsMobileMenuOpen(false)}
                  itemClassName="block rounded-full px-4 py-3 text-base hover:bg-accent"
                  activeClassName="text-organic-accent-800"
                />

                {showUserProfile ? (
                  <Link
                    href={FAVORITES_HREF}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-full px-4 py-3 text-base transition-colors hover:bg-accent hover:text-primary"
                    aria-current={
                      pathname === FAVORITES_HREF ? "page" : undefined
                    }
                  >
                    <HeartIcon className="size-5" aria-hidden="true" />
                    Favoritos
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-2 block rounded-full border border-border px-4 py-3 text-center font-display text-base transition-colors hover:bg-foreground/[0.07]"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        
        <Link
          href="/"
          className="mr-auto flex shrink-0 items-center gap-[11px] text-foreground"
        >
          <span className="grid size-[38px] place-items-center rounded-full bg-primary">
            <IconPaw className="size-5 text-background" aria-hidden="true" />
          </span>
          <span className="font-display text-[20px]">Adoptame</span>
        </Link>

        
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-[26px] min-[915px]:flex"
        >
          <NavItemsRenderer
            links={links}
            pathname={pathname}
            showUserProfile={showUserProfile}
            itemClassName="text-[14.5px]"
            activeClassName="text-organic-accent-800"
          />
        </nav>

        
        <div className="flex shrink-0 items-center gap-[10px]">
          {showUserProfile && (
            <Link
              href={FAVORITES_HREF}
              aria-label="Favoritos"
              aria-current={pathname === FAVORITES_HREF ? "page" : undefined}
              className="hidden size-9 place-items-center rounded-full border border-border transition-colors hover:bg-foreground/[0.07] min-[915px]:grid"
            >
              <HeartIcon className="size-[18px]" aria-hidden="true" />
            </Link>
          )}

          {showUserProfile ? (
            <UserMenu userImage={userImage} />
          ) : (
            <Link
              href="/sign-in"
              className="hidden rounded-full border border-border px-[18px] py-[9px] font-display text-[14px] leading-[1.2] transition-colors hover:bg-foreground/[0.07] min-[915px]:inline-flex"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="theme-organic fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-popover/90 px-1 pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-popover/75 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-1px_8px_color-mix(in_srgb,#2e2b25_10%,transparent)] sm:hidden"
      >
        {mobileTabs.map(({ label, href, icon: Icon }) => {
          const active = isTabActive(href);

          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] leading-tight transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                active
                  ? "font-medium text-organic-accent-700"
                  : "text-organic-neutral-600 hover:text-organic-neutral-900"
              }`}
            >
              <Icon
                className={`size-[21px] transition-transform group-active:scale-95 ${
                  active ? "stroke-[2.25]" : "stroke-[1.8]"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default TopNav;
