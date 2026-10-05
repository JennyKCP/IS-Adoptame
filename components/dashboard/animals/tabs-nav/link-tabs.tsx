"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
interface TabLink {
  href: string;
  label: string;
}

interface LinkTabsProps {
  links: TabLink[];
  className?: string;
}

export function LinkTabs({ links, className }: LinkTabsProps) {
  const pathname = usePathname();

  
  const activeLink = links
    .filter((link) => pathname.startsWith(link.href))
    .reduce(
      (bestMatch, currentLink) =>
        currentLink.href.length > bestMatch.href.length
          ? currentLink
          : bestMatch,
      { href: "", label: "" }
    );

  return (
    <div
      className={cn(
        "bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
    >
      {links.map((link) => {
        const isActive = link.href === activeLink.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-foreground dark:text-muted-foreground",
              "inline-flex items-center justify-center whitespace-nowrap",
              "rounded-md border border-transparent px-2 py-1 text-sm font-medium",
              "transition-[color,box-shadow]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              {
                "bg-background text-foreground dark:text-foreground shadow-sm":
                  isActive,
              }
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
