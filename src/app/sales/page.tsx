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

  return (
    <>
      <PageShell
        title="Sales API Dashboard"
        subtitle={salesDataset.label}
        actions={<Button onClick={() => setIsSyncOpen(true)}>Sync Sales</Button>}
      >
        <TimeRangeSelector
          value={range}
          onChange={setRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
        />
        <SummaryCardGrid stats={salesDataset.summary} />
        <AgentCardGrid agents={salesDataset.agents} onAgentSelect={setSelectedAgent} />
      </PageShell>

      <AgentDetailsModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      <Modal isOpen={isSyncOpen} title="Sync Complete" onClose={() => setIsSyncOpen(false)}>
        Sales API sync completed successfully (mock).
      </Modal>
    </>
  );
}
