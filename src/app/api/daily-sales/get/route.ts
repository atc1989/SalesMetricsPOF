import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DailySalesDetailRow = {
  daily_sales_id: number | string | null;
  pof_number: string | null;
  trans_date: string | null;
  member_name: string | null;
  username: string | null;
  package_type: string | null;
  quantity: number | string | null;
  original_price: number | string | null;
  discount: number | string | null;
  price_after_discount: number | string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  is_to_blister: boolean | null;
  one_time_discount: number | string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
  to_follow_count: number | string | null;
  to_follow_blpk_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
  payment_type: string | null;
  reference_number: string | null;
  sales_two: number | string | null;
  mode_of_payment_two: string | null;
  payment_type_two: string | null;
  reference_number_two: string | null;
  sales_three: number | string | null;
  mode_of_payment_three: string | null;
  payment_type_three: string | null;
  reference_number_three: string | null;
  remarks: string | null;
  received_by: string | null;
  collected_by: string | null;
  bag_type: string | null;
  bag_quantity: number | string | null;
  marketing_tool: string | null;
  marketing_quantity: number | string | null;
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
  return value === true;
}

export async function GET(request: NextRequest) {
  const dailySalesIdValue = request.nextUrl.searchParams.get("dailySalesId")?.trim();
  const pofNumber = request.nextUrl.searchParams.get("pofNumber")?.trim();
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim();
  const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim();
  const dailySalesId = dailySalesIdValue ? Number(dailySalesIdValue) : null;

  if ((!dailySalesIdValue || !Number.isFinite(dailySalesId)) && !pofNumber && !username) {
    return NextResponse.json(
      { success: false, message: "Missing dailySalesId/pofNumber/username." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("daily_sales")
    .select(
      "daily_sales_id, pof_number, trans_date, member_name, username, package_type, quantity, original_price, discount, price_after_discount, bottle_count, blister_count, is_to_blister, one_time_discount, released_count, released_blpk_count, to_follow_count, to_follow_blpk_count, sales, mode_of_payment, payment_type, reference_number, sales_two, mode_of_payment_two, payment_type_two, reference_number_two, sales_three, mode_of_payment_three, payment_type_three, reference_number_three, remarks, received_by, collected_by, bag_type, bag_quantity, marketing_tool, marketing_quantity",
    )
    .order("daily_sales_id", { ascending: true });

  if (dailySalesIdValue && Number.isFinite(dailySalesId)) {
    query = query.eq("daily_sales_id", dailySalesId);
  } else {
    if (pofNumber) {
      query = query.eq("pof_number", pofNumber);
    }

    if (username) {
      query = query.eq("username", username);

      if (dateFrom) {
        query = query.gte("trans_date", dateFrom);
      }

      if (dateTo) {
        query = query.lte("trans_date", dateTo);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load daily sales print details",
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
    const typedRow = row as DailySalesDetailRow;

    return {
      daily_sales_id: toNumber(typedRow.daily_sales_id),
      pof_number: typedRow.pof_number ?? "",
      trans_date: typedRow.trans_date ?? "",
      member_name: typedRow.member_name ?? "",
      username: typedRow.username ?? "",
      package_type: typedRow.package_type ?? "",
      quantity: toNumber(typedRow.quantity),
      original_price: toNumber(typedRow.original_price),
      discount: toNumber(typedRow.discount),
      price_after_discount: toNumber(typedRow.price_after_discount),
      bottle_count: toNumber(typedRow.bottle_count),
      blister_count: toNumber(typedRow.blister_count),
      is_to_blister: toBoolean(typedRow.is_to_blister),
      one_time_discount: toNumber(typedRow.one_time_discount),
      released_count: toNumber(typedRow.released_count),
      released_blpk_count: toNumber(typedRow.released_blpk_count),
      to_follow_count: toNumber(typedRow.to_follow_count),
      to_follow_blpk_count: toNumber(typedRow.to_follow_blpk_count),
      sales: toNumber(typedRow.sales),
      mode_of_payment: typedRow.mode_of_payment ?? "",
      payment_type: typedRow.payment_type ?? "",
      reference_number: typedRow.reference_number ?? "",
      sales_two: toNumber(typedRow.sales_two),
      mode_of_payment_two: typedRow.mode_of_payment_two ?? "",
      payment_type_two: typedRow.payment_type_two ?? "",
      reference_number_two: typedRow.reference_number_two ?? "",
      sales_three: toNumber(typedRow.sales_three),
      mode_of_payment_three: typedRow.mode_of_payment_three ?? "",
      payment_type_three: typedRow.payment_type_three ?? "",
      reference_number_three: typedRow.reference_number_three ?? "",
      remarks: typedRow.remarks ?? "",
      received_by: typedRow.received_by ?? "",
      collected_by: typedRow.collected_by ?? "",
      bag_type: typedRow.bag_type ?? "",
      bag_quantity: toNumber(typedRow.bag_quantity),
      marketing_tool: typedRow.marketing_tool ?? "",
      marketing_quantity: toNumber(typedRow.marketing_quantity),
    };
  });

  return NextResponse.json({
    success: true,
    data: rows,
  });
}
