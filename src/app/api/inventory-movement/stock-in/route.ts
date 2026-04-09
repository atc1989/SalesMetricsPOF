import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isIsoDateString, normalizeWholeNumber } from "@/lib/inventoryMovement";

export const dynamic = "force-dynamic";

const SUPABASE_UNDEFINED_TABLE_CODE = "42P01";

type JsonObject = Record<string, unknown>;

function readString(body: JsonObject, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonObject | null;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const movementDate = readString(body, "movementDate") || readString(body, "movement_date");
  const note = readString(body, "note");
  const bottleIn = normalizeWholeNumber(body.bottleIn ?? body.bottle_in);
  const blisterIn = normalizeWholeNumber(body.blisterIn ?? body.blister_in);

  if (!movementDate || !isIsoDateString(movementDate)) {
    return NextResponse.json(
      { success: false, message: "Missing or invalid movementDate." },
      { status: 400 },
    );
  }

  if (bottleIn === 0 && blisterIn === 0) {
    return NextResponse.json(
      { success: false, message: "Please enter at least one bottle or blister stock-in value." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = {
      movement_date: movementDate,
      bottle_in: bottleIn,
      blister_in: blisterIn,
      note,
    };

    const { data, error } = await supabase
      .from("inventory_stock_movements")
      .insert(payload)
      .select("inventory_stock_movement_id, movement_date, bottle_in, blister_in, note, created_at")
      .single();

    if (error) {
      if (error.code === SUPABASE_UNDEFINED_TABLE_CODE) {
        return NextResponse.json(
          {
            success: false,
            message: "Stock-in table not found yet. Please run the SQL setup for inventory_stock_movements first.",
            error: {
              code: error.code,
              details: error.details,
              message: error.message,
            },
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to save stock-in record.",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      row: {
        id: normalizeWholeNumber(data.inventory_stock_movement_id),
        movement_date: data.movement_date,
        bottle_in: normalizeWholeNumber(data.bottle_in),
        blister_in: normalizeWholeNumber(data.blister_in),
        note: data.note ?? "",
        created_at: data.created_at ?? "",
      },
    });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save stock-in record.",
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
