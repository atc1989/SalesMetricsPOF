"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getNavLinksForRole, isNavLinkActive } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

export function MobileSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navLinks = getNavLinksForRole(profile?.role ?? "super_admin");

  return (
    <div className="md:hidden">
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        Menu
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-border bg-card p-4">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-semibold text-foreground">SalesMetrics</h2>
                <button
                  aria-label="Close menu"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  x
                </button>
              </div>
              <nav>
                <ul className="space-y-1">
                  {navLinks.map((link) => {
                    const isActive = isNavLinkActive(pathname, link.href);

                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div>
              <span className="inline-flex rounded-full border border-input bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Mock Mode
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
