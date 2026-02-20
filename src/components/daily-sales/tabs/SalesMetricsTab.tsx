'use client';

import { useMemo, useState } from 'react';
import { AgentCardGrid } from '@/components/dashboard/AgentCardGrid';
import { AgentDetailsModal } from '@/components/dashboard/AgentDetailsModal';
import { SummaryCardGrid } from '@/components/dashboard/SummaryCardGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dashboardAgents, dashboardSummary } from '@/lib/mock/dashboard';
import type { AgentPerformance, SummaryStat, TimeRange } from '@/types/dashboard';

const rangeToScale: Record<TimeRange, number> = {
  daily: 1,
  weekly: 1.35,
  monthly: 1.7,
  custom: 1,
};

const parseNumericValue = (value: string) => Number(value.replace(/[^0-9.-]/g, '')) || 0;

const formatSummaryValue = (template: string, numericValue: number) => {
  if (template.includes('$')) {
    return `$${Math.round(numericValue).toLocaleString()}`;
  }

  return Math.round(numericValue).toLocaleString();
};

const getCustomScale = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    return 1;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const millis = end.getTime() - start.getTime();

  if (Number.isNaN(millis) || millis < 0) {
    return 1;
  }

  const days = Math.floor(millis / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(days / 7, 0.5), 2.5);
};

export function SalesMetricsTab() {
  const [range, setRange] = useState<TimeRange>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState('');
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);

  const scale = useMemo(() => {
    if (range !== 'custom') {
      return rangeToScale[range];
    }

    return getCustomScale(appliedCustomStartDate, appliedCustomEndDate);
  }, [range, appliedCustomStartDate, appliedCustomEndDate]);

  const summaryStats = useMemo<SummaryStat[]>(
    () =>
      dashboardSummary.map((stat) => {
        const base = parseNumericValue(stat.value);
        const scaled = base * scale;

        return {
          ...stat,
          value: formatSummaryValue(stat.value, scaled),
        };
      }),
    [scale]
  );

  const agentStats = useMemo<AgentPerformance[]>(
    () =>
      dashboardAgents.map((agent) => ({
        ...agent,
        sales: Math.round(agent.sales * scale),
        target: Math.round(agent.target * scale),
      })),
    [scale]
  );

  const rankedAgentStats = useMemo(
    () => [...agentStats].sort((a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales),
    [agentStats]
  );

  const selectedAgentRank = selectedAgent
    ? rankedAgentStats.findIndex((agent) => agent.id === selectedAgent.id) + 1
    : null;

  const applyCustomDate = () => {
    setAppliedCustomStartDate(customStartDate);
    setAppliedCustomEndDate(customEndDate);
  };

  return (
    <section id="sales-metrics" className="mt-4 space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sales Metrics</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button id="btnDaily" size="sm" variant={range === 'daily' ? 'primary' : 'secondary'} onClick={() => setRange('daily')}>
              Daily
            </Button>
            <Button id="btnWeekly" size="sm" variant={range === 'weekly' ? 'primary' : 'secondary'} onClick={() => setRange('weekly')}>
              Weekly
            </Button>
            <Button id="btnMonthly" size="sm" variant={range === 'monthly' ? 'primary' : 'secondary'} onClick={() => setRange('monthly')}>
              Monthly
            </Button>
            <Button id="btnCustom" size="sm" variant={range === 'custom' ? 'primary' : 'secondary'} onClick={() => setRange('custom')}>
              Custom
            </Button>
            <div className="h-9 overflow-hidden">
              <div
                aria-hidden={range !== 'custom'}
                className={`flex h-9 items-center gap-2 transition-all duration-200 ease-out ${
                  range === 'custom' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                }`}
              >
                <input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm"
                />
                <input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm"
                />
                <Button id="apply-custom-date" size="sm" variant="secondary" onClick={applyCustomDate}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div id="summary-cards">
        <SummaryCardGrid stats={summaryStats} />
      </div>

      <div id="agent-cards">
        <AgentCardGrid agents={agentStats} onAgentSelect={setSelectedAgent} />
      </div>

      <AgentDetailsModal agent={selectedAgent} rank={selectedAgentRank} onClose={() => setSelectedAgent(null)} />
    </section>
  );
}
