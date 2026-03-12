import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeDailySalesPackageType } from "@/lib/dailySalesPackages";

export const dynamic = "force-dynamic";

type DailySalesRow = {
  package_type: string | null;
  quantity: number | string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
};

type PackageTotalsRow = {
  package_type: string;
  total_quantity: number;
  total_bottles: number;
  total_blisters: number;
  total_sales: number;
};

type PaymentSummaryRow = {
  mode_of_payment: string;
  total_sales: number;
  transactions: number;
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

function normalizeText(value: string | null, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizePackageType(value: string | null) {
  const rawValue = normalizeText(value, "UNKNOWN");
  const normalized = normalizeDailySalesPackageType(rawValue);
  return normalized ?? rawValue.toUpperCase();
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
      .from("daily_sales")
      .select(
        "package_type, quantity, bottle_count, blister_count, released_count, released_blpk_count, sales, mode_of_payment",
      )
      .eq("trans_date", transDate);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load daily sales report",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    const packageMap = new Map<string, PackageTotalsRow>();
    const paymentMap = new Map<string, PaymentSummaryRow>();

    for (const record of data ?? []) {
      const row = record as DailySalesRow;
      const packageType = normalizePackageType(row.package_type);
      const modeOfPayment = normalizeText(row.mode_of_payment, "UNKNOWN");
      const quantity = toNumber(row.quantity);
      const fallbackBottles = row.bottle_count == null ? quantity : toNumber(row.bottle_count);
      const fallbackBlisters = row.blister_count == null ? 0 : toNumber(row.blister_count);
      const bottles = row.released_count == null ? fallbackBottles : toNumber(row.released_count);
      const blisters =
        row.released_blpk_count == null ? fallbackBlisters : toNumber(row.released_blpk_count);
      const sales = toNumber(row.sales);

      const packageTotals = packageMap.get(packageType) ?? {
        package_type: packageType,
        total_quantity: 0,
        total_bottles: 0,
        total_blisters: 0,
        total_sales: 0,
      };

      packageTotals.total_quantity += quantity;
      packageTotals.total_bottles += bottles;
      packageTotals.total_blisters += blisters;
      packageTotals.total_sales += sales;
      packageMap.set(packageType, packageTotals);

      const paymentSummary = paymentMap.get(modeOfPayment) ?? {
        mode_of_payment: modeOfPayment,
        total_sales: 0,
        transactions: 0,
      };
      paymentSummary.total_sales += sales;
      paymentSummary.transactions += 1;
      paymentMap.set(modeOfPayment, paymentSummary);
    }

    const packageTotals = Array.from(packageMap.values()).sort((a, b) =>
      a.package_type.localeCompare(b.package_type),
    );
    const paymentSummary = Array.from(paymentMap.values()).sort((a, b) =>
      a.mode_of_payment.localeCompare(b.mode_of_payment),
    );

    const totals = packageTotals.reduce(
      (acc, row) => {
        acc.total_sales += row.total_sales;
        acc.total_bottles += row.total_bottles;
        acc.total_blisters += row.total_blisters;
        return acc;
      },
      {
        total_sales: 0,
        total_bottles: 0,
        total_blisters: 0,
        total_transactions: (data ?? []).length,
      },
    );

    return NextResponse.json({
      success: true,
      transDate,
      packageTotals,
      paymentSummary,
      totals,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load daily sales report",
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
