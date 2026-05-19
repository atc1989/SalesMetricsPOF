import { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type TopHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
