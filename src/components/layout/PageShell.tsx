import { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type PageShellProps = {
  title: string;
  subtitle?: string;
  headerCenter?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, subtitle, headerCenter, actions, children }: PageShellProps) {
  return (
    <section className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>

            {actions ? (
              <div className="justify-self-end">{actions}</div>
            ) : (
              <div className="justify-self-end lg:col-start-3" />
            )}

            {headerCenter ? (
              <div className="col-span-2 flex w-full justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-auto lg:justify-self-center">
                {headerCenter}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {children}
    </section>
  );
}
