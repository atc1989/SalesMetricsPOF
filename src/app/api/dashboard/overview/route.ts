import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { AgentPerformance, SummaryStat } from "@/types/dashboard";
import { SalesDataset } from "@/types/sales";

export const dynamic = "force-dynamic";

type RpcRow = Record<string, unknown>;
type DashboardAgent = AgentPerformance & { avatarUrl?: string };

function asRpcRow(value: unknown): RpcRow {
  return value !== null && typeof value === "object" ? (value as RpcRow) : {};
}

function getFirstValue(row: unknown, keys: string[]): unknown {
  const safe = asRpcRow(row);
  for (const key of keys) {
    if (key in safe) {
      return safe[key];
    }
  }
  return undefined;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function normalizeDashboardData(rows: unknown[]): SalesDataset {
  const agents: DashboardAgent[] = rows.map((row, index) => {
    const id =
      toStringValue(getFirstValue(row, ["leader_id", "id", "agent_id"])) ??
      `agent-${index + 1}`;
    const name =
      toStringValue(getFirstValue(row, ["leader_name", "name", "agent_name"])) ??
      `Agent ${index + 1}`;
    const sales = toNumber(getFirstValue(row, ["sales", "sales_total", "amount"]));
    const target = toNumber(
      getFirstValue(row, ["target", "goal", "quota", "target_sales"]),
      sales,
    );
    const perfValue = getFirstValue(row, ["perf_perc", "conversion_rate", "conversionRate"]);
    const conversionRate = toNumber(perfValue);
    const avatarUrl = toStringValue(getFirstValue(row, ["avatar", "avatar_url", "image"]));
    const status: AgentPerformance["status"] = perfValue == null ? "idle" : "active";

    return {
      id,
      name,
      sales,
      target,
      conversionRate,
      status,
      ...(avatarUrl ? { avatarUrl } : {}),
    };
  });

  const totalSales = agents.reduce((sum, agent) => sum + agent.sales, 0);
  const totalBottles = rows.reduce<number>(
    (sum, row) => sum + toNumber(getFirstValue(row, ["bottle_count", "bottles"])),
    0,
  );
  const totalMembers = rows.reduce<number>(
    (sum, row) => sum + toNumber(getFirstValue(row, ["member_count", "members"])),
    0,
  );
  const avgPerformance =
    agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.conversionRate, 0) / agents.length
      : 0;

  const summary: SummaryStat[] = [
    {
      id: "total-sales",
      label: "Total Sales",
      value: `$${Math.round(totalSales).toLocaleString()}`,
      trend: "neutral",
    },
    {
      id: "total-bottles",
      label: "Total Bottles",
      value: Math.round(totalBottles).toLocaleString(),
      trend: "neutral",
    },
    {
      id: "members",
      label: "Members",
      value: Math.round(totalMembers).toLocaleString(),
      trend: "neutral",
    },
    {
      id: "performance-avg",
      label: "Performance Avg",
      value: `${Math.round(avgPerformance)}%`,
      trend: "neutral",
    },
  ];

  return {
    label: "Dashboard Overview",
    summary,
    agents,
  };
}

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, message: "Missing dateFrom/dateTo" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("rpc_sales_api_performance", {
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load dashboard overview",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = normalizeDashboardData(rows);

    return NextResponse.json({
      success: true,
      data: normalized,
      rawData: rows,
    });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard overview",
        error: {
          code: "SERVER_ERROR",
          details: safeMessage,
          message: safeMessage,
        },
      },
      { status: 500 },
    );
  }
}
