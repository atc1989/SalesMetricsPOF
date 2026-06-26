import {
  CalendarDays,
  ClipboardList,
  Keyboard,
  LayoutDashboard,
  Package,
  Plug,
  Receipt,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  isPathAllowedForRole,
  type AppRole,
} from "@/lib/auth/roles";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavLink[];
};

export const appNavGroups: NavGroup[] = [
  {
    label: "Sales",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/sales", label: "Sales API", icon: Plug },
      { href: "/daily-sales", label: "Daily Sales", icon: CalendarDays },
      { href: "/encoder", label: "Encoder", icon: Keyboard },
      { href: "/inventory-movement", label: "Inventory Movement", icon: Package },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/budget", label: "Budget", icon: Receipt },
      { href: "/pcf", label: "PCF", icon: Wallet },
      { href: "/event-forms", label: "Event Forms", icon: ClipboardList },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/cash-flow", label: "Balance Report", icon: Scale },
    ],
  },
];

export const appNavLinks: NavLink[] = appNavGroups.flatMap((group) => group.items);

export function getNavGroupsForRole(role: AppRole): NavGroup[] {
  return appNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isPathAllowedForRole(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getNavLinksForRole(role: AppRole): NavLink[] {
  return getNavGroupsForRole(role).flatMap((group) => group.items);
}

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
