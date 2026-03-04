import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SalesReportRow = {
  pof_number: string | null;
  trans_date: string | null;
  member_name: string | null;
  username: string | null;
  package_type: string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
  payment_type: string | null;
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

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, message: "Missing dateFrom/dateTo" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_sales")
    .select(
      "pof_number, trans_date, member_name, username, package_type, bottle_count, blister_count, sales, mode_of_payment, payment_type",
    )
    .gte("trans_date", dateFrom)
    .lte("trans_date", dateTo)
    .order("trans_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load sales report",
        error: {
          code: error.code,
          details: error.details,
          message: error.message,
        },
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []).map((row) => {
    const typedRow = row as SalesReportRow;
    return {
      pof_number: typedRow.pof_number,
      trans_date: typedRow.trans_date,
      member_name: typedRow.member_name,
      username: typedRow.username,
      package_type: typedRow.package_type,
      bottle_count: toNumber(typedRow.bottle_count),
      blister_count: toNumber(typedRow.blister_count),
      sales: toNumber(typedRow.sales),
      mode_of_payment: typedRow.mode_of_payment,
      payment_type: typedRow.payment_type,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.total_sales += row.sales;
      acc.total_bottles += row.bottle_count;
      acc.total_blisters += row.blister_count;
      acc.total_transactions += 1;
      return acc;
    },
    {
      total_sales: 0,
      total_bottles: 0,
      total_blisters: 0,
      total_transactions: 0,
    },
  );

  return NextResponse.json({
    success: true,
    rows,
    totals,
  });
}

// Example:
// /api/reports/sales-report?dateFrom=2025-02-11&dateTo=2025-02-11
// /api/reports/sales-report?dateFrom=2025-02-01&dateTo=2025-02-28
