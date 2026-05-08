export type NavLink = {
  href: string;
  label: string;
};

export const appNavLinks: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Sales API" },
  { href: "/daily-sales", label: "Daily Sales" },
  { href: "/encoder", label: "Encoder" },
  { href: "/inventory-movement", label: "Inventory Movement" },
];

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
