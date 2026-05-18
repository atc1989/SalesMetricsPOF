"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavLinks, isNavLinkActive } from "@/components/layout/navigation";
import { UserMenu } from "@/components/layout/UserMenu";

export function AppTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-slate-950">
            SalesMetrics
          </Link>
        </div>

        <nav aria-label="Main navigation" className="-mx-1 overflow-x-auto pb-1 lg:mx-0 lg:pb-0 lg:flex-1">
          <ul className="flex min-w-max items-center gap-1 px-1">
            {appNavLinks.map((link) => {
              const isActive = isNavLinkActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
