"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appNavLinks, isNavLinkActive } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";

export function MobileSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        Menu
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-slate-200 bg-white p-4">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base font-semibold text-slate-900">SalesMetrics</h2>
                <button
                  aria-label="Close menu"
                  className="rounded-md p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setIsOpen(false)}
                >
                  x
                </button>
              </div>
              <nav>
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
              <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Mock Mode
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
