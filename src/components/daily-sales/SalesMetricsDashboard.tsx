"use client";

import { useState } from "react";
import { AgentCardGrid } from "@/components/dashboard/AgentCardGrid";
import { AgentDetailsModal } from "@/components/dashboard/AgentDetailsModal";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { Card } from "@/components/ui/Card";
import { AgentPerformance, TimeRange } from "@/types/dashboard";

export function SalesMetricsDashboard() {
  const [range, setRange] = useState<TimeRange>("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [summaryStats] = useState([]);
  const [agentStats] = useState<AgentPerformance[]>([]);

  return (
    <>
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Sales Metrics</h3>
          <TimeRangeSelector
            value={range}
            onChange={setRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
        </div>
      </Card>

      <SummaryCardGrid stats={summaryStats} />
      <AgentCardGrid agents={agentStats} onAgentSelect={setSelectedAgent} />
      <AgentDetailsModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </>
  );
}
