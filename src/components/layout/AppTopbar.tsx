"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Vault } from "lucide-react";

import { appNavLinks, isNavLinkActive } from "@/components/layout/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

export function AppTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 lg:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Vault className="size-4" />
          </span>
          SalesMetrics
        </Link>

        <nav
          aria-label="Main navigation"
          className="-mx-1 flex-1 overflow-x-auto"
        >
          <ul className="flex min-w-max items-center gap-1 px-1">
            {appNavLinks.map((link) => {
              const isActive = isNavLinkActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
