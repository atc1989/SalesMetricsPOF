"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavLinks, isNavLinkActive } from "@/components/layout/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border bg-card md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:justify-between">
      <div>
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">SalesMetrics</h1>
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
                      isActive ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <span className="inline-flex rounded-full border border-input bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Mock Mode
        </span>
      </div>
    </aside>
  );
}
