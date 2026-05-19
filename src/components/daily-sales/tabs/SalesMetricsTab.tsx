"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentCardGrid } from "@/components/dashboard/AgentCardGrid";
import { AgentDetailsModal } from "@/components/dashboard/AgentDetailsModal";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { AgentPerformance, TimeRange } from "@/types/dashboard";
import type { SalesDataset } from "@/types/sales";

type SalesPerformanceResponse = {
  success: boolean;
  data?: SalesDataset;
  message?: string;
};

const emptyDataset: SalesDataset = {
  label: "Sales API Dataset",
  summary: [],
  agents: [],
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const resolveDateRange = (
  range: TimeRange,
  customStartDate: string,
  customEndDate: string,
) => {
  const today = new Date();
  const dateTo = toIsoDate(today);

  if (range === "custom" && customStartDate && customEndDate) {
    return { dateFrom: customStartDate, dateTo: customEndDate };
  }

  if (range === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  if (range === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  return { dateFrom: dateTo, dateTo };
};

const ranges: { label: string; value: TimeRange }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
];

export function SalesMetricsTab() {
  const [range, setRange] = useState<TimeRange>("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [dataset, setDataset] = useState<SalesDataset>(emptyDataset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { dateFrom, dateTo } = useMemo(
    () => resolveDateRange(range, appliedCustomStartDate, appliedCustomEndDate),
    [range, appliedCustomStartDate, appliedCustomEndDate],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSalesPerformance() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({ dateFrom, dateTo });
        const response = await fetch(`/api/sales/performance?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as SalesPerformanceResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? "Failed to load sales performance.");
        }

        setDataset(payload.data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage("Failed to load sales performance.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSalesPerformance();

    return () => {
      controller.abort();
    };
  }, [dateFrom, dateTo]);

  const rankedAgentStats = useMemo(
    () =>
      [...dataset.agents].sort(
        (a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales,
      ),
    [dataset.agents],
  );

  const selectedAgentRank = selectedAgent
    ? rankedAgentStats.findIndex((agent) => agent.id === selectedAgent.id) + 1
    : null;

  const applyCustomDate = () => {
    setAppliedCustomStartDate(customStartDate);
    setAppliedCustomEndDate(customEndDate);
  };

  const isCustom = range === "custom";

  return (
    <section id="sales-metrics" className="mt-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Sales Metrics</CardTitle>
              <CardDescription>
                Sales performance from the external sales API for the selected range.
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={range}
              onValueChange={(value) => value && setRange(value as TimeRange)}
            >
              {ranges.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        {isCustom && (
          <CardContent>
            <div
              className={cn(
                "flex flex-wrap items-end gap-2 transition-all duration-200 ease-out",
                isCustom
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0",
              )}
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="start-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  From
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="h-9 w-[160px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="end-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  To
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="h-9 w-[160px]"
                />
              </div>
              <Button id="apply-custom-date" size="sm" onClick={applyCustomDate}>
                Apply
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load sales performance</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div id="summary-cards">
        <SummaryCardGrid stats={dataset.summary} />
      </div>

      {!isLoading && !errorMessage && dataset.agents.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No metrics for selected range</EmptyTitle>
            <EmptyDescription>
              Try a different time range to populate the chart and agent list.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div id="agent-cards">
          <AgentCardGrid agents={dataset.agents} onAgentSelect={setSelectedAgent} />
        </div>
      )}

      <AgentDetailsModal
        agent={selectedAgent}
        rank={selectedAgentRank}
        onClose={() => setSelectedAgent(null)}
      />
    </section>
  );
}
