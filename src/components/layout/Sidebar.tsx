"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

export const appNavLinks: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Sales API" },
  { href: "/daily-sales", label: "Daily Sales" },
  { href: "/encoder", label: "Encoder" },
];

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col md:justify-between">
      <div>
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">SalesMetrics</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {appNavLinks.map((link) => {
              const isActive = isNavLinkActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="p-4">
        <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Mock Mode
        </span>
      </div>
    </aside>
  );
}
