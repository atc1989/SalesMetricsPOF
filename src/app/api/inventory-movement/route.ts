import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  INITIAL_BLISTER_STOCK,
  INITIAL_BOTTLE_STOCK,
  normalizeWholeNumber,
} from "@/lib/inventoryMovement";

export const dynamic = "force-dynamic";

const SUPABASE_UNDEFINED_TABLE_CODE = "42P01";

type InventoryMovementSourceRow = {
  movement_date: string | null;
  bottle_opening: number | string | null;
  bottle_in: number | string | null;
  bottle_out: number | string | null;
  bottle_closing: number | string | null;
  blister_opening: number | string | null;
  blister_in: number | string | null;
  blister_out: number | string | null;
  blister_closing: number | string | null;
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
    const [{ data: rangeRows, error: rangeError }, { data: firstRowData, error: firstRowError }] =
      await Promise.all([
        supabase
          .from("inventory_movement_daily")
          .select(
            "movement_date, bottle_opening, bottle_in, bottle_out, bottle_closing, blister_opening, blister_in, blister_out, blister_closing, created_at",
          )
          .gte("movement_date", dateFrom)
          .lte("movement_date", dateTo)
          .order("movement_date", { ascending: true }),
        supabase
          .from("inventory_movement_daily")
          .select(
            "movement_date, bottle_opening, bottle_in, bottle_out, bottle_closing, blister_opening, blister_in, blister_out, blister_closing, created_at",
          )
          .order("movement_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    const isMissingMainTable =
      rangeError?.code === SUPABASE_UNDEFINED_TABLE_CODE || firstRowError?.code === SUPABASE_UNDEFINED_TABLE_CODE;

    if (isMissingMainTable) {
      return NextResponse.json(
        {
          success: false,
          message: "inventory_movement_daily table not found. Please create and populate it first.",
        },
        { status: 400 },
      );
    }

    if (rangeError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load inventory movement rows.",
          error: {
            code: rangeError.code,
            details: rangeError.details,
            message: rangeError.message,
          },
        },
        { status: 500 },
      );
    }

    if (firstRowError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load initial inventory movement row.",
          error: {
            code: firstRowError.code,
            details: firstRowError.details,
            message: firstRowError.message,
          },
        },
        { status: 500 },
      );
    }

    const rows = ((rangeRows ?? []) as InventoryMovementSourceRow[]).map((row) => {
      const date = row.movement_date?.trim() ?? "";

      return {
        date,
        bottleOpening: normalizeWholeNumber(row.bottle_opening),
        bottleIn: normalizeWholeNumber(row.bottle_in),
        bottleOut: normalizeWholeNumber(row.bottle_out),
        bottleClosing: normalizeWholeNumber(row.bottle_closing),
        blisterOpening: normalizeWholeNumber(row.blister_opening),
        blisterIn: normalizeWholeNumber(row.blister_in),
        blisterOut: normalizeWholeNumber(row.blister_out),
        blisterClosing: normalizeWholeNumber(row.blister_closing),
      };
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

    const stockIns = ((rangeRows ?? []) as InventoryMovementSourceRow[])
      .filter((row) => normalizeWholeNumber(row.bottle_in) > 0 || normalizeWholeNumber(row.blister_in) > 0)
      .map((row) => ({
        id: row.movement_date?.trim() ?? "",
        movement_date: row.movement_date?.trim() ?? "",
        bottle_in: normalizeWholeNumber(row.bottle_in),
        blister_in: normalizeWholeNumber(row.blister_in),
        note: "",
        created_at: row.created_at ?? "",
      }));

    const initialRow = firstRowData as InventoryMovementSourceRow | null;
    const firstRow = rows[0] ?? null;
    const lastRow = rows[rows.length - 1] ?? null;

    return NextResponse.json({
      success: true,
      rows,
      stockIns,
      totals,
      summary: {
        initialBottleStock: initialRow ? normalizeWholeNumber(initialRow.bottle_opening) : INITIAL_BOTTLE_STOCK,
        initialBlisterStock: initialRow ? normalizeWholeNumber(initialRow.blister_opening) : INITIAL_BLISTER_STOCK,
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
