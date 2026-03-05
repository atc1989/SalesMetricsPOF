'use client';

import { useEffect, useMemo, useState } from 'react';
import { AgentCardGrid } from '@/components/dashboard/AgentCardGrid';
import { AgentDetailsModal } from '@/components/dashboard/AgentDetailsModal';
import { SummaryCardGrid } from '@/components/dashboard/SummaryCardGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AgentPerformance, TimeRange } from '@/types/dashboard';
import type { SalesDataset } from '@/types/sales';

type SalesPerformanceResponse = {
  success: boolean;
  data?: SalesDataset;
  message?: string;
};

const emptyDataset: SalesDataset = {
  label: 'Sales API Dataset',
  summary: [],
  agents: [],
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const resolveDateRange = (
  range: TimeRange,
  customStartDate: string,
  customEndDate: string
) => {
  const today = new Date();
  const dateTo = toIsoDate(today);

  if (range === 'custom' && customStartDate && customEndDate) {
    return { dateFrom: customStartDate, dateTo: customEndDate };
  }

  if (range === 'weekly') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  if (range === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  return { dateFrom: dateTo, dateTo };
};

export function SalesMetricsTab() {
  const [range, setRange] = useState<TimeRange>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState('');
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [dataset, setDataset] = useState<SalesDataset>(emptyDataset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { dateFrom, dateTo } = useMemo(
    () => resolveDateRange(range, appliedCustomStartDate, appliedCustomEndDate),
    [range, appliedCustomStartDate, appliedCustomEndDate]
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
          throw new Error(payload.message ?? 'Failed to load sales performance.');
        }

        setDataset(payload.data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setErrorMessage('Failed to load sales performance.');
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
    () => [...dataset.agents].sort((a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales),
    [dataset.agents]
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

      {isLoading ? <p className="text-sm text-slate-500">Loading latest sales performance...</p> : null}
      {errorMessage ? <p className="text-sm text-amber-600">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && dataset.agents.length === 0 ? (
        <p className="text-sm text-slate-500">No metrics for selected range.</p>
      ) : null}

      <div id="summary-cards">
        <SummaryCardGrid stats={dataset.summary} />
      </div>

      <div id="agent-cards">
        <AgentCardGrid agents={dataset.agents} onAgentSelect={setSelectedAgent} />
      </div>

      <AgentDetailsModal agent={selectedAgent} rank={selectedAgentRank} onClose={() => setSelectedAgent(null)} />
    </section>
  );
}
