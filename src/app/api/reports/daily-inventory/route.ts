import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InventorySourceRow = {
  trans_date: string | null;
  member_name: string | null;
  username: string | null;
  member_type: string | null;
  pof_number: string | null;
  package_type: string | null;
  quantity: number | string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
  to_follow_count: number | string | null;
  to_follow_blpk_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
  mode_of_payment_two: string | null;
  mode_of_payment_three: string | null;
  bag_type: string | null;
  bag_quantity: number | string | null;
  marketing_tool: string | null;
  marketing_quantity: number | string | null;
};

type InventoryReportRow = {
  trans_date: string | null;
  member_name: string;
  username: string;
  member_type: string;
  pof_number: string;
  package_type: string;
  quantity: number;
  bottle_count: number;
  blister_count: number;
  released_count: number;
  released_blpk_count: number;
  to_follow_count: number;
  to_follow_blpk_count: number;
  sales: number;
  mode_of_payment: string;
  mode_of_payment_two: string;
  mode_of_payment_three: string;
  bag_type: string;
  bag_quantity: number;
  marketing_tool: string;
  marketing_quantity: number;
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

function normalizeText(value: string | null, fallback = "") {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
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
        "trans_date, member_name, username, member_type, pof_number, package_type, quantity, bottle_count, blister_count, released_count, released_blpk_count, to_follow_count, to_follow_blpk_count, sales, mode_of_payment, mode_of_payment_two, mode_of_payment_three, bag_type, bag_quantity, marketing_tool, marketing_quantity",
      )
      .gte("trans_date", dateFrom)
      .lte("trans_date", dateTo)
      .order("trans_date", { ascending: false })
      .order("daily_sales_id", { ascending: false });

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

    const rows: InventoryReportRow[] = (data ?? []).map((record) => {
      const row = record as InventorySourceRow;

      return {
        trans_date: row.trans_date,
        member_name: normalizeText(row.member_name, "N/A"),
        username: normalizeText(row.username, "-"),
        member_type: normalizeText(row.member_type, "N/A"),
        pof_number: normalizeText(row.pof_number, "-"),
        package_type: normalizeText(row.package_type, "UNKNOWN"),
        quantity: toNumber(row.quantity),
        bottle_count: toNumber(row.bottle_count),
        blister_count: toNumber(row.blister_count),
        released_count: toNumber(row.released_count),
        released_blpk_count: toNumber(row.released_blpk_count),
        to_follow_count: toNumber(row.to_follow_count),
        to_follow_blpk_count: toNumber(row.to_follow_blpk_count),
        sales: toNumber(row.sales),
        mode_of_payment: normalizeText(row.mode_of_payment, "N/A"),
        mode_of_payment_two: normalizeText(row.mode_of_payment_two, ""),
        mode_of_payment_three: normalizeText(row.mode_of_payment_three, ""),
        bag_type: normalizeText(row.bag_type, ""),
        bag_quantity: toNumber(row.bag_quantity),
        marketing_tool: normalizeText(row.marketing_tool, ""),
        marketing_quantity: toNumber(row.marketing_quantity),
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.total_quantity += row.quantity;
        acc.total_bottles += row.bottle_count;
        acc.total_blisters += row.blister_count;
        return acc;
      },
      {
        total_quantity: 0,
        total_bottles: 0,
        total_blisters: 0,
        total_transactions: rows.length,
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
