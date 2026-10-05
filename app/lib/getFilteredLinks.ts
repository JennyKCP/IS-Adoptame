import { NavDocument, NavItem } from "@/components/dashboard/nav/nav-links.config";
import { hasPermission } from "./auth/hasPermission";
import { type AppPermission } from "./auth/permissions";


export const hasAnyPermission = async (
  permissions: readonly AppPermission[]
): Promise<boolean> => {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return true;
    }
  }
  return false;
};


const navItemAllowed = async (item: {
  permission?: AppPermission;
  anyPermissions?: readonly AppPermission[];
}): Promise<boolean> => {
  if (item.anyPermissions && item.anyPermissions.length > 0) {
    return hasAnyPermission(item.anyPermissions);
  }
  if (item.permission) {
    return hasPermission(item.permission);
  }
  return true;
};


export const getFilteredNavLinks = async (
  items: readonly NavItem[]
): Promise<NavItem[]> => {
  const filteredLinks: NavItem[] = [];

  for (const item of items) {
    
    if (!(await navItemAllowed(item))) {
      continue; 
    }

    
    if (item.items && item.items.length > 0) {
      const filteredSubItems = [];

      for (const subItem of item.items) {
        if (!subItem.permission || (await hasPermission(subItem.permission))) {
          filteredSubItems.push(subItem);
        }
      }

      
      if (filteredSubItems.length > 0) {
        filteredLinks.push({
          ...item,
          items: filteredSubItems,
        });
      }
    } else {
      
      filteredLinks.push(item);
    }
  }

  return filteredLinks;
};


export const getFilteredDocuments = async (
  items: readonly NavDocument[]
): Promise<NavDocument[]> => {
  const filteredDocs: NavDocument[] = [];

  for (const item of items) {
    
    if (!item.permission || (await hasPermission(item.permission))) {
      filteredDocs.push(item);
    }
  }

  return filteredDocs;
};
