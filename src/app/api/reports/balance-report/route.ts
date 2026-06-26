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

  const [salesResult, billsResult] = await Promise.all([
    // Sales from daily_sales
    supabase
      .from("daily_sales")
      .select(
        "trans_date, sales, sales_two, sales_three, mode_of_payment, mode_of_payment_two, mode_of_payment_three"
      )
      .gte("trans_date", dateFrom)
      .lte("trans_date", dateTo)
      .order("trans_date", { ascending: true }),

    // Expenses from bills (total budget), excluding void/rejected
    // Join bill_breakdowns for category breakdown
    supabase
      .from("bills")
      .select(
        "id, request_date, total_amount, payment_method, status, bill_breakdowns(category, amount)"
      )
      .gte("request_date", dateFrom)
      .lte("request_date", dateTo)
      .not("status", "in", '("void","rejected")')
      .order("request_date", { ascending: true }),
  ]);

  if (salesResult.error) {
    return NextResponse.json(
      { success: false, message: salesResult.error.message },
      { status: 500 }
    );
  }

  if (billsResult.error) {
    return NextResponse.json(
      { success: false, message: billsResult.error.message },
      { status: 500 }
    );
  }

  // --- Sales: per-date, per-payment-mode ---
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

  // --- Expenses (bills): per-date, per-payment-method; categories from bill_breakdowns ---
  // expensesByDate[date][paymentMethod] = total bill amount
  const expensesByDate = new Map<string, Map<string, number>>();
  // categoriesByDate[date][category] = total breakdown amount
  const categoriesByDate = new Map<string, Map<string, number>>();

  for (const bill of billsResult.data ?? []) {
    const date = (bill.request_date as string) ?? "";
    if (!date) continue;

    const method = (bill.payment_method as string) || "other";
    const billAmount = toNum(bill.total_amount);

    if (!expensesByDate.has(date)) expensesByDate.set(date, new Map());
    const expMap = expensesByDate.get(date)!;
    expMap.set(method, (expMap.get(method) ?? 0) + billAmount);

    // Categories from bill_breakdowns
    if (!categoriesByDate.has(date)) categoriesByDate.set(date, new Map());
    const catMap = categoriesByDate.get(date)!;

    const breakdowns = (bill.bill_breakdowns as { category: string | null; amount: unknown }[]) ?? [];
    if (breakdowns.length > 0) {
      for (const bd of breakdowns) {
        const cat = (bd.category || "Uncategorized").trim() || "Uncategorized";
        catMap.set(cat, (catMap.get(cat) ?? 0) + toNum(bd.amount));
      }
    } else {
      // No breakdown rows — bucket under "Uncategorized"
      catMap.set("Uncategorized", (catMap.get("Uncategorized") ?? 0) + billAmount);
    }
  }

  // --- Collect all unique dates ---
  const allDates = new Set<string>([
    ...salesByDate.keys(),
    ...expensesByDate.keys(),
  ]);
  const sortedDates = Array.from(allDates).sort();

  const allPaymentModes = new Set<string>();
  for (const m of salesByDate.values()) for (const k of m.keys()) allPaymentModes.add(k);

  const allBillPaymentMethods = new Set<string>();
  for (const m of expensesByDate.values()) for (const k of m.keys()) allBillPaymentMethods.add(k);

  // --- Build result rows ---
  const rows = sortedDates.map((date) => {
    const salesModeMap = salesByDate.get(date) ?? new Map();
    const expMethodMap = expensesByDate.get(date) ?? new Map();
    const catMap = categoriesByDate.get(date) ?? new Map();

    const salesByMode: Record<string, number> = Object.fromEntries(salesModeMap);
    const expensesByPaymentMethod: Record<string, number> = Object.fromEntries(expMethodMap);
    const expensesByCategory: Record<string, number> = Object.fromEntries(catMap);

    const totalSales = Array.from(salesModeMap.values()).reduce((a, b) => a + b, 0);
    const totalExpenses = Array.from(expMethodMap.values()).reduce((a, b) => a + b, 0);

    return {
      date,
      salesByMode,
      totalSales,
      expensesByPaymentMethod,
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
    allBillPaymentMethods: Array.from(allBillPaymentMethods).sort(),
  });
}
