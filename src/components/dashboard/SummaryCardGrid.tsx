import { SummaryStat } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

        const card = (
          <Card className={cn("h-full", isOverallCard && onOverallOpen && "transition-colors hover:bg-accent")}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardDescription>{stat.label}</CardDescription>
                <Badge variant={trendToVariant[stat.trend]}>{stat.trend}</Badge>
              </div>
              <CardTitle className="text-3xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        );

        if (isOverallCard && onOverallOpen) {
          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => onOverallOpen(stat.value)}
              aria-label="Open overall summary"
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
            >
              {card}
            </button>
          );
        }

        return <div key={stat.id}>{card}</div>;
      })}
    </div>
  );
}
