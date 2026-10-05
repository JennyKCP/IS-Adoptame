"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { getIcon } from "./icon-map";
import { NavDocument } from "./nav-links.config";
import { usePathname } from "next/navigation";

export function NavDocuments({ items }: { items: NavDocument[] }) {
  const pathname = usePathname();

  const isActive = (itemUrl: string) => {
    return pathname === itemUrl || pathname.startsWith(itemUrl + "/");
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = getIcon(item.icon);
          const active = isActive(item.url);
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={active}>
                <Link href={item.url}>
                  <Icon className="size-4" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
