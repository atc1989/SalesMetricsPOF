import { SalesMetricKpi } from "@/types/dailySales";
import { Card } from "@/components/ui/card";

type SalesOverviewKPIsProps = {
  kpis: SalesMetricKpi[];
};

export function SalesOverviewKPIs({ kpis }: SalesOverviewKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.id}>
          <p className="text-sm text-muted-foreground">{kpi.label}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{kpi.value}</p>
        </Card>
      ))}
    </div>
  );
}
