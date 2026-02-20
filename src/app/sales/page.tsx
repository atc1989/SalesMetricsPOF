"use client";

import { useState } from "react";
import { AgentCardGrid } from "@/components/dashboard/AgentCardGrid";
import { AgentDetailsModal } from "@/components/dashboard/AgentDetailsModal";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { salesDataset } from "@/lib/mock/sales";
import { AgentPerformance, TimeRange } from "@/types/dashboard";

export default function SalesPage() {
  const [range, setRange] = useState<TimeRange>("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const rankedAgents = [...salesDataset.agents].sort((a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales);
  const selectedAgentRank = selectedAgent ? rankedAgents.findIndex((agent) => agent.id === selectedAgent.id) + 1 : null;

  const handleRefresh = () => {
    setRefreshTick((value) => value + 1);
  };

  return (
    <>
      <PageShell
        title="Sales API Dashboard"
        subtitle={salesDataset.label}
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
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        }
        actions={<Button onClick={() => setIsSyncOpen(true)}>Sync Sales</Button>}
      >
        <SummaryCardGrid key={`summary-${refreshTick}`} stats={salesDataset.summary} />
        <AgentCardGrid key={`agents-${refreshTick}`} agents={salesDataset.agents} onAgentSelect={setSelectedAgent} />
      </PageShell>

      <AgentDetailsModal agent={selectedAgent} rank={selectedAgentRank} onClose={() => setSelectedAgent(null)} />
      <Modal isOpen={isSyncOpen} title="Sync Complete" onClose={() => setIsSyncOpen(false)}>
        Sales API sync completed successfully (mock).
      </Modal>
    </>
  );
}
