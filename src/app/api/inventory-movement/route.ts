import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  buildInventoryMovementRows,
  INITIAL_BLISTER_STOCK,
  INITIAL_BOTTLE_STOCK,
  normalizeWholeNumber,
} from "@/lib/inventoryMovement";

export const dynamic = "force-dynamic";

const SUPABASE_UNDEFINED_TABLE_CODE = "42P01";

type DailySalesMovementSourceRow = {
  trans_date: string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
};

type InventoryStockInSourceRow = {
  inventory_stock_movement_id: number | string | null;
  movement_date: string | null;
  bottle_in: number | string | null;
  blister_in: number | string | null;
  note: string | null;
  created_at: string | null;
};

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim() ?? "";

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, message: "Missing dateFrom/dateTo." },
      { status: 400 },
    );
  }

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { success: false, message: "dateFrom must be before or equal to dateTo." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    const [{ data: dailySalesRows, error: dailySalesError }, { data: stockInRows, error: stockInError }] =
      await Promise.all([
        supabase
          .from("daily_sales")
          .select("trans_date, released_count, released_blpk_count")
          .lte("trans_date", dateTo),
        supabase
          .from("inventory_stock_movements")
          .select("inventory_stock_movement_id, movement_date, bottle_in, blister_in, note, created_at")
          .lte("movement_date", dateTo)
          .order("movement_date", { ascending: false })
          .order("inventory_stock_movement_id", { ascending: false }),
      ]);

    if (dailySalesError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load released inventory totals.",
          error: {
            code: dailySalesError.code,
            details: dailySalesError.details,
            message: dailySalesError.message,
          },
        },
        { status: 500 },
      );
    }

    const isMissingStockInTable = stockInError?.code === SUPABASE_UNDEFINED_TABLE_CODE;

    if (stockInError && !isMissingStockInTable) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load stock-in records.",
          error: {
            code: stockInError.code,
            details: stockInError.details,
            message: stockInError.message,
          },
        },
        { status: 500 },
      );
    }

    const releasedByDate = new Map<string, { bottleOut: number; blisterOut: number }>();

    for (const row of (dailySalesRows ?? []) as DailySalesMovementSourceRow[]) {
      const date = row.trans_date?.trim();

      if (!date) {
        continue;
      }

      const current = releasedByDate.get(date) ?? { bottleOut: 0, blisterOut: 0 };
      current.bottleOut += normalizeWholeNumber(row.released_count);
      current.blisterOut += normalizeWholeNumber(row.released_blpk_count);
      releasedByDate.set(date, current);
    }

    const normalizedStockInRows = isMissingStockInTable
      ? []
      : ((stockInRows ?? []) as InventoryStockInSourceRow[]);

    const stockInByDate = new Map<string, { bottleIn: number; blisterIn: number }>();
    const stockInRecords = normalizedStockInRows.map((row) => {
      const date = row.movement_date?.trim() ?? "";
      const bottleIn = normalizeWholeNumber(row.bottle_in);
      const blisterIn = normalizeWholeNumber(row.blister_in);
      const current = stockInByDate.get(date) ?? { bottleIn: 0, blisterIn: 0 };

      if (date) {
        current.bottleIn += bottleIn;
        current.blisterIn += blisterIn;
        stockInByDate.set(date, current);
      }

      return {
        id: normalizeWholeNumber(row.inventory_stock_movement_id),
        movement_date: date,
        bottle_in: bottleIn,
        blister_in: blisterIn,
        note: row.note?.trim() ?? "",
        created_at: row.created_at ?? "",
      };
    });

    const rows = buildInventoryMovementRows({
      dateFrom,
      dateTo,
      releasedByDate,
      stockInByDate,
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.bottleIn += row.bottleIn;
        acc.bottleOut += row.bottleOut;
        acc.blisterIn += row.blisterIn;
        acc.blisterOut += row.blisterOut;
        return acc;
      },
      {
        bottleIn: 0,
        bottleOut: 0,
        blisterIn: 0,
        blisterOut: 0,
      },
    );

    const filteredStockIns = stockInRecords.filter(
      (row) => row.movement_date >= dateFrom && row.movement_date <= dateTo,
    );
    const firstRow = rows[0] ?? null;
    const lastRow = rows[rows.length - 1] ?? null;

    return NextResponse.json({
      success: true,
      message: isMissingStockInTable
        ? "Stock-in table not found yet. Run the SQL setup to enable stock-in entries."
        : undefined,
      stockInSetupRequired: isMissingStockInTable,
      rows,
      stockIns: filteredStockIns,
      totals,
      summary: {
        initialBottleStock: INITIAL_BOTTLE_STOCK,
        initialBlisterStock: INITIAL_BLISTER_STOCK,
        rangeOpeningBottleStock: firstRow?.bottleOpening ?? INITIAL_BOTTLE_STOCK,
        rangeOpeningBlisterStock: firstRow?.blisterOpening ?? INITIAL_BLISTER_STOCK,
        rangeClosingBottleStock: lastRow?.bottleClosing ?? INITIAL_BOTTLE_STOCK,
        rangeClosingBlisterStock: lastRow?.blisterClosing ?? INITIAL_BLISTER_STOCK,
      },
    });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load inventory movement.",
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
