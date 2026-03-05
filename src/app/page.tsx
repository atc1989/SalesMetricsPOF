"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentCardGrid } from "@/components/dashboard/AgentCardGrid";
import { AgentDetailsModal } from "@/components/dashboard/AgentDetailsModal";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AgentPerformance, TimeRange } from "@/types/dashboard";
import { SalesDataset } from "@/types/sales";

type DashboardOverviewResponse = {
  success: boolean;
  data?: SalesDataset;
  message?: string;
};

const emptyDataset: SalesDataset = {
  label: "Home/Index - Sales performance overview",
  summary: [],
  agents: [],
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(range: TimeRange, customStartDate: string, customEndDate: string) {
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
}

export default function HomePage() {
  const [range, setRange] = useState<TimeRange>("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataset, setDataset] = useState<SalesDataset>(emptyDataset);

  const { dateFrom, dateTo } = useMemo(
    () => resolveDateRange(range, customStartDate, customEndDate),
    [range, customStartDate, customEndDate],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardOverview() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({ dateFrom, dateTo });
        const response = await fetch(`/api/dashboard/overview?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as DashboardOverviewResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? "Failed to load dashboard overview.");
        }

        setDataset(payload.data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setErrorMessage("Failed to load dashboard overview.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboardOverview();

    return () => {
      controller.abort();
    };
  }, [dateFrom, dateTo]);

  return (
    <>
      <PageShell
        title="Dashboard"
        subtitle={dataset.label}
        headerCenter={
          <TimeRangeSelector
            value={range}
            onChange={setRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
        }
        actions={<Button onClick={() => setIsSyncOpen(true)}>Sync All</Button>}
      >
        {isLoading ? <p className="text-sm text-slate-500">Loading latest dashboard overview...</p> : null}
        {errorMessage ? <p className="text-sm text-amber-600">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && dataset.agents.length === 0 ? (
          <p className="text-sm text-slate-500">No data for selected range.</p>
        ) : null}
        <SummaryCardGrid stats={dataset.summary} />
        <AgentCardGrid agents={dataset.agents} onAgentSelect={setSelectedAgent} />
      </PageShell>

      <AgentDetailsModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      <Modal isOpen={isSyncOpen} title="Sync Complete" onClose={() => setIsSyncOpen(false)}>
        All modules were synced successfully.
      </Modal>
    </>
  );
}
