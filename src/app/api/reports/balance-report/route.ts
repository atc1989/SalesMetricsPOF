import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, message: "Missing dateFrom/dateTo" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const [salesResult, expensesResult] = await Promise.all([
    supabase
      .from("daily_sales")
      .select(
        "trans_date, sales, sales_two, sales_three, mode_of_payment, mode_of_payment_two, mode_of_payment_three"
      )
      .gte("trans_date", dateFrom)
      .lte("trans_date", dateTo)
      .order("trans_date", { ascending: true }),

    supabase
      .from("pcf_transactions")
      .select("date, amount_out, description, payee")
      .eq("transaction_type", "expense")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: true }),
  ]);

  if (salesResult.error) {
    return NextResponse.json(
      { success: false, message: salesResult.error.message },
      { status: 500 }
    );
  }

  if (expensesResult.error) {
    return NextResponse.json(
      { success: false, message: expensesResult.error.message },
      { status: 500 }
    );
  }

  // --- Build per-date sales map keyed by payment mode ---
  // salesByDate[date][paymentMode] = amount
  const salesByDate = new Map<string, Map<string, number>>();

  for (const row of salesResult.data ?? []) {
    const date = (row.trans_date as string) ?? "";
    if (!date) continue;

    if (!salesByDate.has(date)) salesByDate.set(date, new Map());
    const dateMap = salesByDate.get(date)!;

    const entries: [string, number][] = [
      [row.mode_of_payment as string, toNum(row.sales)],
      [row.mode_of_payment_two as string, toNum(row.sales_two)],
      [row.mode_of_payment_three as string, toNum((row as Record<string, unknown>).sales_three)],
    ];

    for (const [mode, amount] of entries) {
      if (!mode || amount <= 0) continue;
      dateMap.set(mode, (dateMap.get(mode) ?? 0) + amount);
    }
  }

  // --- Build per-date expenses map keyed by category (description || payee) ---
  const expensesByDate = new Map<string, Map<string, number>>();

  for (const row of expensesResult.data ?? []) {
    const date = (row.date as string) ?? "";
    if (!date) continue;

    const category =
      ((row.description as string) || (row.payee as string) || "Uncategorized").trim() ||
      "Uncategorized";

    if (!expensesByDate.has(date)) expensesByDate.set(date, new Map());
    const dateMap = expensesByDate.get(date)!;
    dateMap.set(category, (dateMap.get(category) ?? 0) + toNum(row.amount_out));
  }

  // --- Collect all unique dates, payment modes, and expense categories ---
  const allDates = new Set<string>([
    ...salesByDate.keys(),
    ...expensesByDate.keys(),
  ]);
  const sortedDates = Array.from(allDates).sort();

  const allPaymentModes = new Set<string>();
  for (const dateMap of salesByDate.values()) {
    for (const mode of dateMap.keys()) allPaymentModes.add(mode);
  }

  const allExpenseCategories = new Set<string>();
  for (const dateMap of expensesByDate.values()) {
    for (const cat of dateMap.keys()) allExpenseCategories.add(cat);
  }

  // --- Build result rows ---
  const rows = sortedDates.map((date) => {
    const salesModeMap = salesByDate.get(date) ?? new Map();
    const expCatMap = expensesByDate.get(date) ?? new Map();

    const salesByMode: Record<string, number> = {};
    for (const [mode, amount] of salesModeMap) salesByMode[mode] = amount;

    const expensesByCategory: Record<string, number> = {};
    for (const [cat, amount] of expCatMap) expensesByCategory[cat] = amount;

    const totalSales = Array.from(salesModeMap.values()).reduce((a, b) => a + b, 0);
    const totalExpenses = Array.from(expCatMap.values()).reduce((a, b) => a + b, 0);

    return {
      date,
      salesByMode,
      totalSales,
      expensesByCategory,
      totalExpenses,
      balance: totalSales - totalExpenses,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      totalSales: acc.totalSales + r.totalSales,
      totalExpenses: acc.totalExpenses + r.totalExpenses,
      balance: acc.balance + r.balance,
    }),
    { totalSales: 0, totalExpenses: 0, balance: 0 }
  );

  return NextResponse.json({
    success: true,
    rows,
    totals,
    allPaymentModes: Array.from(allPaymentModes).sort(),
    allExpenseCategories: Array.from(allExpenseCategories).sort(),
  });
}
