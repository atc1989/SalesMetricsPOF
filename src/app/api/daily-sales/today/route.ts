import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DailySalesRow = {
  daily_sales_id: number | string | null;
  trans_date: string | null;
  pof_number: string | null;
  member_name: string | null;
  username: string | null;
  package_type: string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
  payment_type: string | null;
  is_new_member: boolean | null;
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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return false;
}

function normalizeRow(row: DailySalesRow) {
  return {
    daily_sales_id: row.daily_sales_id,
    trans_date: row.trans_date,
    pof_number: row.pof_number,
    member_name: row.member_name,
    username: row.username,
    package_type: row.package_type,
    bottle_count: toNumber(row.bottle_count),
    blister_count: toNumber(row.blister_count),
    sales: toNumber(row.sales),
    mode_of_payment: row.mode_of_payment,
    payment_type: row.payment_type,
    is_new_member: toBoolean(row.is_new_member),
  };
}

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");
  const modeOfPayment = request.nextUrl.searchParams.get("modeOfPayment");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, message: "Missing dateFrom/dateTo" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("daily_sales")
    .select(
      "daily_sales_id,trans_date,pof_number,member_name,username,package_type,bottle_count,blister_count,sales,mode_of_payment,payment_type,is_new_member",
    )
    .gte("trans_date", dateFrom)
    .lte("trans_date", dateTo)
    .order("trans_date", { ascending: false })
    .order("daily_sales_id", { ascending: false });

  if (modeOfPayment && modeOfPayment !== "ALL") {
    query = query.eq("mode_of_payment", modeOfPayment);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load daily sales",
        error: {
          code: error.code ?? "SUPABASE_QUERY_ERROR",
          details: error.message,
        },
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []).map((row) => normalizeRow(row as DailySalesRow));
  const totals = rows.reduce(
    (acc, row) => {
      acc.totalSales += row.sales;
      acc.totalBottles += row.bottle_count;
      acc.totalBlisters += row.blister_count;
      acc.totalTransactions += 1;
      acc.newMembers += row.is_new_member ? 1 : 0;
      return acc;
    },
    {
      totalSales: 0,
      totalBottles: 0,
      totalBlisters: 0,
      totalTransactions: 0,
      newMembers: 0,
    },
  );

  return NextResponse.json({
    success: true,
    rows,
    totals,
  });
}

// Example:
// /api/daily-sales/today?dateFrom=2025-02-11&dateTo=2025-02-11
// /api/daily-sales/today?dateFrom=2025-02-01&dateTo=2025-02-28&modeOfPayment=CASH
