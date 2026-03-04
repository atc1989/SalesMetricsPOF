import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InventorySourceRow = {
  trans_date: string | null;
  package_type: string | null;
  quantity: number | string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  is_to_blister: boolean | null;
};

type AggregatedInventoryRow = {
  package_type: string;
  total_quantity: number;
  total_bottles: number;
  total_blisters: number;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizePackageType(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "UNKNOWN";
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
    const { data, error } = await supabase
      .from("daily_sales")
      .select(
        "trans_date, package_type, quantity, bottle_count, blister_count, is_to_blister",
      )
      .gte("trans_date", dateFrom)
      .lte("trans_date", dateTo);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load inventory report",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    const grouped = new Map<string, AggregatedInventoryRow>();

    for (const record of data ?? []) {
      const row = record as InventorySourceRow;
      const packageType = normalizePackageType(row.package_type);
      const quantity = toNumber(row.quantity);
      const bottles = row.bottle_count == null ? quantity : toNumber(row.bottle_count);
      const blisters = row.blister_count == null ? 0 : toNumber(row.blister_count);
      const current = grouped.get(packageType) ?? {
        package_type: packageType,
        total_quantity: 0,
        total_bottles: 0,
        total_blisters: 0,
      };

      current.total_quantity += quantity;
      current.total_bottles += bottles;
      current.total_blisters += blisters;

      grouped.set(packageType, current);
    }

    const rows = Array.from(grouped.values()).sort((a, b) =>
      a.package_type.localeCompare(b.package_type),
    );

    const totals = rows.reduce(
      (acc, row) => {
        acc.total_quantity += row.total_quantity;
        acc.total_bottles += row.total_bottles;
        acc.total_blisters += row.total_blisters;
        return acc;
      },
      {
        total_quantity: 0,
        total_bottles: 0,
        total_blisters: 0,
        distinct_packages: rows.length,
      },
    );

    return NextResponse.json({
      success: true,
      rows,
      totals,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load inventory report",
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

// Example:
// /api/reports/daily-inventory?dateFrom=2025-02-11&dateTo=2025-02-11
// /api/reports/daily-inventory?dateFrom=2025-02-01&dateTo=2025-02-28
