import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CashOnHandRow = {
  trans_date: string;
  pcs_one_thousand: number | string | null;
  pcs_five_hundred: number | string | null;
  pcs_two_hundred: number | string | null;
  pcs_one_hundred: number | string | null;
  pcs_fifty: number | string | null;
  pcs_twenty: number | string | null;
  pcs_ten: number | string | null;
  pcs_five: number | string | null;
  pcs_one: number | string | null;
  pcs_cents: number | string | null;
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
  const transDate = request.nextUrl.searchParams.get("transDate");

  if (!transDate) {
    return NextResponse.json(
      { success: false, message: "Missing transDate" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cash_on_hand")
      .select("*")
      .eq("trans_date", transDate)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load cash on hand",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    const row = data as CashOnHandRow | null;
    const totalCash =
      1000 * toNumber(row?.pcs_one_thousand) +
      500 * toNumber(row?.pcs_five_hundred) +
      200 * toNumber(row?.pcs_two_hundred) +
      100 * toNumber(row?.pcs_one_hundred) +
      50 * toNumber(row?.pcs_fifty) +
      20 * toNumber(row?.pcs_twenty) +
      10 * toNumber(row?.pcs_ten) +
      5 * toNumber(row?.pcs_five) +
      1 * toNumber(row?.pcs_one) +
      0.01 * toNumber(row?.pcs_cents);

    return NextResponse.json({
      success: true,
      transDate,
      row,
      total_cash: totalCash,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load cash on hand",
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
