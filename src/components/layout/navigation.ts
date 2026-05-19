import {
  CalendarDays,
  ClipboardList,
  Keyboard,
  LayoutDashboard,
  Package,
  Plug,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

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
      { href: "/bills", label: "Bills", icon: Receipt },
      { href: "/pcf", label: "PCF", icon: Wallet },
      { href: "/event-forms", label: "Event Forms", icon: ClipboardList },
    ],
  },
];

export const appNavLinks: NavLink[] = appNavGroups.flatMap((group) => group.items);

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
