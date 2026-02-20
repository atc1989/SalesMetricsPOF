import { AgentPerformance } from "@/types/dashboard";
import { Modal } from "@/components/ui/Modal";

type AgentDetailsModalProps = {
  agent: AgentPerformance | null;
  rank?: number | null;
  onClose: () => void;
};

type AgentOverallSummary = {
  expenses: string;
  targetRatio: string;
  actualRatio: string;
  bottlesSold: string;
  memberCount: string;
  activeMembers: string;
  performance: string;
};

const overallSummaryByAgentId: Record<string, AgentOverallSummary> = {
  s1: {
    expenses: "₱0.0",
    targetRatio: "30:1",
    actualRatio: "4,189,800,000.0:1",
    bottlesSold: "162",
    memberCount: "2513",
    activeMembers: "47",
    performance: "13,966,000,000.0%",
  },
  s2: {
    expenses: "₱0.0",
    targetRatio: "28:1",
    actualRatio: "3,250,700,000.0:1",
    bottlesSold: "149",
    memberCount: "2310",
    activeMembers: "43",
    performance: "11,609,642,857.1%",
  },
  s3: {
    expenses: "₱0.0",
    targetRatio: "24:1",
    actualRatio: "2,880,000,000.0:1",
    bottlesSold: "136",
    memberCount: "2054",
    activeMembers: "38",
    performance: "12,000,000,000.0%",
  },
};

function formatPeso(value: number) {
  return `₱${value.toLocaleString()}.0`;
}

export function AgentDetailsModal({ agent, rank, onClose }: AgentDetailsModalProps) {
  const agentSummary = agent ? overallSummaryByAgentId[agent.id] : null;

  return (
    <Modal
      isOpen={Boolean(agent)}
      title="Overall Summary"
      onClose={onClose}
      panelClassName="max-w-3xl"
      headerClassName="bg-slate-900"
      titleClassName="text-white"
      closeButtonContent="×"
      closeButtonClassName="text-xl text-white hover:bg-slate-800"
      closeButtonAriaLabel="Close agent details"
    >
      {agent ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rank Number</p>
            <p className="mt-1 font-semibold text-slate-900">#{rank ?? "-"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</p>
            <p className="mt-1 font-semibold text-slate-900">{agent.name}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Sales</p>
            <p className="mt-1 font-semibold text-slate-900">{formatPeso(agent.sales)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expenses</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.expenses ?? "₱0.0"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Target Ratio</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.targetRatio ?? "30:1"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Actual Ratio</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.actualRatio ?? "0.0:1"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bottles Sold</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.bottlesSold ?? "0"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Member Count</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.memberCount ?? "0"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Members</p>
            <p className="mt-1 font-semibold text-slate-900">{agentSummary?.activeMembers ?? "0"}</p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-100 p-3 md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Performance</p>
            <p className="mt-1 font-semibold text-emerald-700">{agentSummary?.performance ?? `${agent.conversionRate}%`}</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
