import { SummaryStat } from "@/types/dashboard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type SummaryCardGridProps = {
  stats: SummaryStat[];
  onOverallOpen?: (totalSalesValue: string) => void;
};

const trendToVariant: Record<SummaryStat["trend"], "success" | "warning" | "neutral"> = {
  up: "success",
  down: "warning",
  neutral: "neutral",
};

export function SummaryCardGrid({ stats, onOverallOpen }: SummaryCardGridProps) {
  const overallCardId = stats.find((stat) => stat.label === "API Total Sales")?.id ?? stats[0]?.id;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const isOverallCard = stat.id === overallCardId;

        const content = (
          <>
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <Badge variant={trendToVariant[stat.trend]}>{stat.trend}</Badge>
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
          </>
        );

        if (isOverallCard && onOverallOpen) {
          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => onOverallOpen(stat.value)}
              aria-label="Open overall summary"
              className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              <Card className="h-full transition-colors hover:bg-slate-50">{content}</Card>
            </button>
          );
        }

        return <Card key={stat.id}>{content}</Card>;
      })}
    </div>
  );
}
