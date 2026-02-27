import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { SalesDataset } from "@/types/sales";
import { AgentPerformance, SummaryStat } from "@/types/dashboard";

type RpcRow = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function asRpcRow(value: unknown): RpcRow {
  return value !== null && typeof value === "object" ? (value as RpcRow) : {};
}

function getFirstValue(row: unknown, keys: string[]): unknown {
  const safeRow = asRpcRow(row);

  for (const key of keys) {
    if (key in safeRow) {
      return safeRow[key];
    }
  }

  return undefined;
}

function normalizeSalesDataset(rows: unknown[]): SalesDataset {
  const agents: AgentPerformance[] = rows.map((row, index) => {
    const id =
      toStringValue(getFirstValue(row, ["id", "leader_id", "agent_id"])) ??
      `agent-${index + 1}`;

    const name =
      toStringValue(getFirstValue(row, ["leader_name", "name", "agent_name"])) ??
      `Agent ${index + 1}`;

    const sales = toNumber(getFirstValue(row, ["sales", "sales_total", "amount"]));
    const target = toNumber(getFirstValue(row, ["target", "goal", "quota"]), sales);
    const conversionRate = toNumber(
      getFirstValue(row, ["conversion_rate", "perf_perc", "conversionRate"]),
    );

    const rawStatus = toStringValue(getFirstValue(row, ["status", "agent_status"]));
    const status: AgentPerformance["status"] = rawStatus === "idle" ? "idle" : "active";

    return {
      id,
      name,
      sales,
      target,
      conversionRate,
      status,
    };
  });

  const totalSales = agents.reduce((sum, agent) => sum + agent.sales, 0);
  const totalOrders = rows.reduce<number>(
    (sum, row) => sum + toNumber(getFirstValue(row, ["orders", "order_count", "deals_total"])),
    0,
  );
  const totalErrors = rows.reduce<number>(
    (sum, row) => sum + toNumber(getFirstValue(row, ["errors", "error_count", "sync_errors"])),
    0,
  );
  const avgConversion =
    agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.conversionRate, 0) / agents.length
      : 0;

  const summary: SummaryStat[] = [
    {
      id: "api-total",
      label: "API Total Sales",
      value: `$${Math.round(totalSales).toLocaleString()}`,
      trend: "up",
    },
    {
      id: "api-orders",
      label: "API Orders",
      value: Math.round(totalOrders).toLocaleString(),
      trend: "up",
    },
    {
      id: "api-errors",
      label: "Sync Errors",
      value: Math.round(totalErrors).toLocaleString(),
      trend: totalErrors > 0 ? "up" : "down",
    },
    {
      id: "api-latency",
      label: "Avg Response",
      value: `${Math.round(avgConversion)}%`,
      trend: "neutral",
    },
  ];

  return {
    label: "Sales API Dataset",
    summary,
    agents,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing required query params: dateFrom and dateTo.",
        error: { code: "BAD_REQUEST" },
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const rpcParamAttempts: Record<string, string>[] = [
      { date_from: dateFrom, date_to: dateTo },
      { p_date_from: dateFrom, p_date_to: dateTo },
      { df: dateFrom, dt: dateTo },
      { dateFrom, dateTo },
      { from_date: dateFrom, to_date: dateTo },
    ];

    let data: unknown = null;
    let error: { code?: string; message: string } | null = null;

    for (const params of rpcParamAttempts) {
      const result = await supabase.rpc("rpc_sales_api_performance", params as never);

      if (!result.error) {
        data = result.data;
        error = null;
        break;
      }

      error = result.error;

      if (result.error.code !== "PGRST202") {
        break;
      }
    }

    if (error) {
      const message =
        error.code === "PGRST202"
          ? "Failed to fetch sales performance. RPC signature mismatch for rpc_sales_api_performance."
          : "Failed to fetch sales performance.";

      return NextResponse.json(
        {
          success: false,
          message,
          error: { code: error.code ?? "SUPABASE_RPC_ERROR", details: error.message },
        },
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = normalizeSalesDataset(rows);

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
        message: "Unexpected server error while loading sales performance.",
        error: { code: "SERVER_ERROR", details: safeMessage },
      },
      { status: 500 },
    );
  }
}

// Quick local test:
// curl "http://localhost:3000/api/sales/performance?dateFrom=2026-02-01&dateTo=2026-02-27"
