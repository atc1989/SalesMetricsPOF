import { AgentPerformance } from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AgentCardGridProps = {
  agents: AgentPerformance[];
  onAgentSelect: (agent: AgentPerformance) => void;
};

type AgentWithOptionalAvatar = AgentPerformance & { avatarUrl?: string };

function getAgentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getStatusStripeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/70";
    case "idle":
      return "bg-muted-foreground/30";
    default:
      return "bg-muted-foreground/30";
  }
}

function getRankCardClass(rank: number) {
  if (rank === 1) return "ring-1 ring-border shadow-md";
  if (rank === 2) return "ring-1 ring-border shadow-sm";
  if (rank === 3) return "ring-1 ring-border/70 shadow-sm";
  return "";
}

export function AgentCardGrid({ agents, onAgentSelect }: AgentCardGridProps) {
  const sortedAgents = [...agents].sort(
    (a, b) => b.conversionRate - a.conversionRate || b.sales - a.sales,
  );

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
            className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card
              className={cn(
                "relative h-full overflow-hidden p-6 transition-colors hover:bg-accent/50",
                getRankCardClass(rank),
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  getStatusStripeClass(agent.status),
                )}
              />
              <Badge
                variant="outline"
                aria-label={`Rank #${rank}`}
                className="absolute left-3 top-3 text-[11px]"
              >
                #{rank}
              </Badge>

              <div className="flex items-start justify-between gap-3 pl-12">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={agent.name} /> : null}
                    <AvatarFallback>{getAgentInitials(agent.name)}</AvatarFallback>
                  </Avatar>
                  <h3 className="truncate font-semibold">{agent.name}</h3>
                </div>
                <Badge variant={agent.status === "active" ? "success" : "neutral"}>
                  {agent.status}
                </Badge>
              </div>

              <div className="mt-3 space-y-2 pl-12">
                <p className="text-base font-semibold tabular-nums">
                  Performance: {agent.conversionRate}%
                </p>
                <div className="space-y-1 text-xs text-muted-foreground tabular-nums">
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
