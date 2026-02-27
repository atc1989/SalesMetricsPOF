"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentCardGrid } from "@/components/dashboard/AgentCardGrid";
import { AgentDetailsModal } from "@/components/dashboard/AgentDetailsModal";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { salesDataset } from "@/lib/mock/sales";
import { AgentPerformance, TimeRange } from "@/types/dashboard";
import { SalesDataset } from "@/types/sales";

type SalesPerformanceResponse = {
  success: boolean;
  data?: SalesDataset;
  message?: string;
};

type SalesSyncResponse = {
  success: boolean;
  message?: string;
  ggFetched?: number;
  upsertRangeCount?: number | null;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(range: TimeRange, customStartDate: string, customEndDate: string) {
  const today = new Date();
  const endDate = toIsoDate(today);

  if (range === "custom" && customStartDate && customEndDate) {
    return { dateFrom: customStartDate, dateTo: customEndDate };
  }

  if (range === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: toIsoDate(start), dateTo: endDate };
  }

  if (range === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(start), dateTo: endDate };
  }

  return { dateFrom: endDate, dateTo: endDate };
}

export default function SalesPage() {
  const [range, setRange] = useState<TimeRange>("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Sales sync has not started.");
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataset, setDataset] = useState<SalesDataset>(salesDataset);

  const { dateFrom, dateTo } = useMemo(
    () => resolveDateRange(range, customStartDate, customEndDate),
    [range, customStartDate, customEndDate],
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
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setDataset(salesDataset);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load live sales data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSalesPerformance();

    return () => {
      controller.abort();
    };
  }, [dateFrom, dateTo, refreshTick]);

  const rankedAgents = [...dataset.agents].sort(
    (a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales,
  );
  const selectedAgentRank = selectedAgent
    ? rankedAgents.findIndex((agent) => agent.id === selectedAgent.id) + 1
    : null;

  const handleRefresh = () => {
    setRefreshTick((value) => value + 1);
  };

  const handleSyncSales = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncOpen(true);
    setIsSyncing(true);
    setSyncMessage("Syncing sales from GG...");

    try {
      const response = await fetch("/api/sales/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo }),
      });
      const payload = (await response.json()) as SalesSyncResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Sales sync failed.");
      }

      const fetched = payload.ggFetched ?? 0;
      const rangeCountText =
        typeof payload.upsertRangeCount === "number"
          ? ` Range count: ${payload.upsertRangeCount.toLocaleString()}.`
          : "";

      setSyncMessage(`Sync complete. GG fetched ${fetched.toLocaleString()} row(s).${rangeCountText}`);
      setRefreshTick((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sales sync failed.";
      setSyncMessage(message);
      setErrorMessage(message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <PageShell
        title="Sales API Dashboard"
        subtitle={dataset.label}
        headerCenter={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <TimeRangeSelector
              value={range}
              onChange={setRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomStartDateChange={setCustomStartDate}
              onCustomEndDateChange={setCustomEndDate}
            />
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        }
        actions={
          <Button onClick={handleSyncSales} disabled={isLoading || isSyncing}>
            Sync Sales
          </Button>
        }
      >
        {isLoading ? <p className="text-sm text-slate-500">Loading latest sales performance...</p> : null}
        {errorMessage ? <p className="text-sm text-amber-600">{errorMessage} Showing fallback data.</p> : null}
        <SummaryCardGrid key={`summary-${refreshTick}`} stats={dataset.summary} />
        <AgentCardGrid key={`agents-${refreshTick}`} agents={dataset.agents} onAgentSelect={setSelectedAgent} />
      </PageShell>

      <AgentDetailsModal agent={selectedAgent} rank={selectedAgentRank} onClose={() => setSelectedAgent(null)} />
      <Modal isOpen={isSyncOpen} title="Sync Sales" onClose={() => setIsSyncOpen(false)}>
        {isSyncing ? "Sync in progress..." : syncMessage}
      </Modal>
    </>
  );
}
