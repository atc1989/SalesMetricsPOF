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
          <p className="text-sm text-slate-600">{kpi.label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{kpi.value}</p>
        </Card>
      ))}
    </div>
  );
}
