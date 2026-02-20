import { AgentPerformance } from "@/types/dashboard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type AgentCardGridProps = {
  agents: AgentPerformance[];
  onAgentSelect: (agent: AgentPerformance) => void;
};

type AgentWithOptionalAvatar = AgentPerformance & {
  avatarUrl?: string;
};

function getAgentInitials(name: string) {
  const nameParts = name.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return "?";
  }

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
}

function getStatusStripeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-300";
    case "idle":
      return "bg-slate-300";
    default:
      return "bg-slate-300";
  }
}

function getRankCardClass(rank: number) {
  if (rank === 1) {
    return "border-slate-300 ring-1 ring-slate-300 shadow-md";
  }

  if (rank === 2) {
    return "border-slate-300 ring-1 ring-slate-200 shadow-sm";
  }

  if (rank === 3) {
    return "border-slate-300 ring-1 ring-slate-100 shadow-sm";
  }

  return "";
}

export function AgentCardGrid({ agents, onAgentSelect }: AgentCardGridProps) {
  const sortedAgents = [...agents].sort((a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sortedAgents.map((agent, index) => {
        const rank = index + 1;
        const avatarUrl = (agent as AgentWithOptionalAvatar).avatarUrl;

        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onAgentSelect(agent)}
            className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            <Card className={`relative h-full overflow-hidden transition-colors hover:bg-slate-50 ${getRankCardClass(rank)}`}>
              <div className={`absolute inset-y-0 left-0 w-1 ${getStatusStripeClass(agent.status)}`} />
              <span
                aria-label={`Rank #${rank}`}
                className="absolute left-3 top-3 inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                #{rank}
              </span>
              <div className="flex items-start justify-between gap-3 pl-12">
                <div className="flex min-w-0 items-center gap-3">
                  {avatarUrl ? (
                    <span
                      role="img"
                      aria-label={`${agent.name} avatar`}
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-cover bg-center"
                      style={{ backgroundImage: `url(${avatarUrl})` }}
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                      {getAgentInitials(agent.name)}
                    </span>
                  )}
                  <h3 className="truncate font-semibold text-slate-900">{agent.name}</h3>
                </div>
                <Badge variant={agent.status === "active" ? "success" : "neutral"}>{agent.status}</Badge>
              </div>
              <div className="mt-3 space-y-2 pl-12">
                <p className="text-base font-semibold text-slate-900">Performance: {agent.conversionRate}%</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>Sales: ${agent.sales.toLocaleString()}</p>
                  <p>Target: ${agent.target.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
