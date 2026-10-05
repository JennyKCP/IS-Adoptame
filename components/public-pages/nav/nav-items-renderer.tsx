"use client";

import clsx from "clsx";
import Link from "next/link";

interface NavLinkItem {
  name: string;
  href: string;
}

interface NavItemsRendererProps {
  links: NavLinkItem[];
  pathname: string;
  showUserProfile: boolean;
  onLinkClick?: () => void; 
  itemClassName: string; 
  activeClassName: string; 
}

const NavItemsRenderer = ({
  links,
  pathname,
  showUserProfile,
  onLinkClick,
  itemClassName,
  activeClassName,
}: NavItemsRendererProps) => {
  return (
    <>
      {links.map((link) =>
        link.name === "Panel" && !showUserProfile ? null : (
          <Link
            key={link.name}
            href={link.href}
            onClick={onLinkClick} 
            className={clsx(
              "transition-colors hover:text-primary",
              itemClassName,
              pathname === link.href && activeClassName
            )}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.name}
          </Link>
        )
      )}
    </>
  );
};

export default NavItemsRenderer;
