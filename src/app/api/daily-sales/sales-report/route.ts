import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeDailySalesPackageType } from "@/lib/dailySalesPackages";

export const dynamic = "force-dynamic";

type DailySalesRow = {
  package_type: string | null;
  member_type: string | null;
  is_new_member: boolean | null;
  quantity: number | string | null;
  bottle_count: number | string | null;
  blister_count: number | string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
  sales: number | string | null;
  mode_of_payment: string | null;
  sales_two: number | string | null;
  mode_of_payment_two: string | null;
  sales_three: number | string | null;
  mode_of_payment_three: string | null;
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

type AccountCounts = {
  silver: number;
  gold: number;
  platinum: number;
};

type CategorySalesSummary = {
  packageTotals: PackageTotalsRow[];
  retailTotals: PackageTotalsRow[];
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

function normalizeMemberType(value: string | null) {
  const normalized = normalizeText(value, "DISTRIBUTOR").toUpperCase();

  if (normalized === "CITY STOCKIST") {
    return "STOCKIST";
  }

  return normalized;
}

function toBoolean(value: unknown) {
  return value === true;
}

function createAccountCounts(): AccountCounts {
  return { silver: 0, gold: 0, platinum: 0 };
}

function addPackageCount(target: AccountCounts, packageType: string, quantity: number) {
  switch (packageType) {
    case "SILVER":
      target.silver += quantity;
      break;
    case "GOLD":
    case "USILVERGOLD":
      target.gold += quantity;
      break;
    case "PLATINUM":
    case "UGOLDPLATINUM":
    case "USILVERPLATINUM":
      target.platinum += quantity;
      break;
    default:
      break;
  }
}

function pushIntoCategoryMap(
  categoryMap: Map<string, PackageTotalsRow>,
  packageType: string,
  quantity: number,
  bottles: number,
  blisters: number,
  sales: number,
) {
  const current = categoryMap.get(packageType) ?? {
    package_type: packageType,
    total_quantity: 0,
    total_bottles: 0,
    total_blisters: 0,
    total_sales: 0,
  };

  current.total_quantity += quantity;
  current.total_bottles += bottles;
  current.total_blisters += blisters;
  current.total_sales += sales;
  categoryMap.set(packageType, current);
}

function summarizeCategory(
  records: Array<{
    packageType: string;
    quantity: number;
    bottles: number;
    blisters: number;
    sales: number;
  }>,
): CategorySalesSummary {
  const packageMap = new Map<string, PackageTotalsRow>();
  const retailMap = new Map<string, PackageTotalsRow>();

  for (const record of records) {
    if (record.packageType === "RETAIL" || record.packageType === "BLISTER") {
      pushIntoCategoryMap(
        retailMap,
        record.packageType,
        record.quantity,
        record.bottles,
        record.blisters,
        record.sales,
      );
      continue;
    }

    pushIntoCategoryMap(
      packageMap,
      record.packageType,
      record.quantity,
      record.bottles,
      record.blisters,
      record.sales,
    );
  }

  return {
    packageTotals: Array.from(packageMap.values()).sort((a, b) =>
      a.package_type.localeCompare(b.package_type),
    ),
    retailTotals: Array.from(retailMap.values()).sort((a, b) =>
      a.package_type.localeCompare(b.package_type),
    ),
  };
}

function addPaymentSummary(
  paymentMap: Map<string, PaymentSummaryRow>,
  modeOfPayment: string | null,
  amount: number,
) {
  const mode = normalizeText(modeOfPayment, "UNKNOWN");
  if (!mode || mode === "N/A" || amount <= 0) {
    return;
  }

  const paymentSummary = paymentMap.get(mode) ?? {
    mode_of_payment: mode,
    total_sales: 0,
    transactions: 0,
  };

  paymentSummary.total_sales += amount;
  paymentSummary.transactions += 1;
  paymentMap.set(mode, paymentSummary);
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
        "package_type, member_type, is_new_member, quantity, bottle_count, blister_count, released_count, released_blpk_count, sales, mode_of_payment, sales_two, mode_of_payment_two, sales_three, mode_of_payment_three",
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
    const stockistRecords: Array<{ packageType: string; quantity: number; bottles: number; blisters: number; sales: number }> = [];
    const centerRecords: Array<{ packageType: string; quantity: number; bottles: number; blisters: number; sales: number }> = [];
    const newAccounts = createAccountCounts();
    const upgrades = createAccountCounts();

    for (const record of data ?? []) {
      const row = record as DailySalesRow;
      const packageType = normalizePackageType(row.package_type);
      const memberType = normalizeMemberType(row.member_type);
      const isNewMember = toBoolean(row.is_new_member);
      const modeOfPayment = normalizeText(row.mode_of_payment, "UNKNOWN");
      const quantity = toNumber(row.quantity);
      const fallbackBottles = row.bottle_count == null ? quantity : toNumber(row.bottle_count);
      const fallbackBlisters = row.blister_count == null ? 0 : toNumber(row.blister_count);
      const bottles = row.released_count == null ? fallbackBottles : toNumber(row.released_count);
      const blisters =
        row.released_blpk_count == null ? fallbackBlisters : toNumber(row.released_blpk_count);
      const sales = toNumber(row.sales);
      const salesTwo = toNumber(row.sales_two);
      const salesThree = toNumber(row.sales_three);
      const primarySales = Math.max(sales - salesTwo - salesThree, 0);

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

      if (memberType === "STOCKIST") {
        stockistRecords.push({ packageType, quantity, bottles, blisters, sales });
      } else if (memberType === "CENTER") {
        centerRecords.push({ packageType, quantity, bottles, blisters, sales });
      }

      if (isNewMember) {
        addPackageCount(newAccounts, packageType, quantity);
      } else {
        addPackageCount(upgrades, packageType, quantity);
      }

      addPaymentSummary(paymentMap, modeOfPayment, primarySales);
      addPaymentSummary(paymentMap, row.mode_of_payment_two, salesTwo);
      addPaymentSummary(paymentMap, row.mode_of_payment_three, salesThree);
    }

    const packageTotals = Array.from(packageMap.values()).sort((a, b) =>
      a.package_type.localeCompare(b.package_type),
    );
    const paymentSummary = Array.from(paymentMap.values()).sort((a, b) =>
      a.mode_of_payment.localeCompare(b.mode_of_payment),
    );
    const stockistSummary = summarizeCategory(stockistRecords);
    const centerSummary = summarizeCategory(centerRecords);

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
      stockistPackageTotals: stockistSummary.packageTotals,
      stockistRetailTotals: stockistSummary.retailTotals,
      centerPackageTotals: centerSummary.packageTotals,
      centerRetailTotals: centerSummary.retailTotals,
      newAccounts,
      upgrades,
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
