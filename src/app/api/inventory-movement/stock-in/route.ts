import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isIsoDateString, normalizeWholeNumber } from "@/lib/inventoryMovement";

export const dynamic = "force-dynamic";

const SUPABASE_UNDEFINED_TABLE_CODE = "42P01";

type JsonObject = Record<string, unknown>;
type InventoryMovementRow = {
  movement_date: string | null;
  bottle_in: number | string | null;
  blister_in: number | string | null;
  bottle_opening: number | string | null;
  bottle_closing: number | string | null;
  blister_opening: number | string | null;
  blister_closing: number | string | null;
};

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
    const { data: targetRow, error: targetError } = await supabase
      .from("inventory_movement_daily")
      .select(
        "movement_date, bottle_in, blister_in, bottle_opening, bottle_closing, blister_opening, blister_closing",
      )
      .eq("movement_date", movementDate)
      .maybeSingle();

    if (targetError) {
      if (targetError.code === SUPABASE_UNDEFINED_TABLE_CODE) {
        return NextResponse.json(
          {
            success: false,
            message: "inventory_movement_daily table not found. Please create and populate it first.",
            error: {
              code: targetError.code,
              details: targetError.details,
              message: targetError.message,
            },
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to load inventory movement row.",
          error: {
            code: targetError.code,
            details: targetError.details,
            message: targetError.message,
          },
        },
        { status: 500 },
      );
    }

    if (!targetRow) {
      return NextResponse.json(
        { success: false, message: "No inventory movement row found for the selected date." },
        { status: 404 },
      );
    }

    const typedTargetRow = targetRow as InventoryMovementRow;
    const nextBottleIn = normalizeWholeNumber(typedTargetRow.bottle_in) + bottleIn;
    const nextBlisterIn = normalizeWholeNumber(typedTargetRow.blister_in) + blisterIn;
    const nextBottleClosing = normalizeWholeNumber(typedTargetRow.bottle_closing) + bottleIn;
    const nextBlisterClosing = normalizeWholeNumber(typedTargetRow.blister_closing) + blisterIn;

    const { error: updateTargetError } = await supabase
      .from("inventory_movement_daily")
      .update({
        bottle_in: nextBottleIn,
        blister_in: nextBlisterIn,
        bottle_closing: nextBottleClosing,
        blister_closing: nextBlisterClosing,
      })
      .eq("movement_date", movementDate);

    if (updateTargetError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update selected inventory movement row.",
          error: {
            code: updateTargetError.code,
            details: updateTargetError.details,
            message: updateTargetError.message,
          },
        },
        { status: 500 },
      );
    }

    const { data: laterRows, error: laterRowsError } = await supabase
      .from("inventory_movement_daily")
      .select(
        "movement_date, bottle_opening, bottle_closing, blister_opening, blister_closing",
      )
      .gt("movement_date", movementDate)
      .order("movement_date", { ascending: true });

    if (laterRowsError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load subsequent inventory movement rows.",
          error: {
            code: laterRowsError.code,
            details: laterRowsError.details,
            message: laterRowsError.message,
          },
        },
        { status: 500 },
      );
    }

    for (const row of (laterRows ?? []) as InventoryMovementRow[]) {
      const rowDate = row.movement_date?.trim();
      if (!rowDate) {
        continue;
      }

      const { error: updateLaterError } = await supabase
        .from("inventory_movement_daily")
        .update({
          bottle_opening: normalizeWholeNumber(row.bottle_opening) + bottleIn,
          bottle_closing: normalizeWholeNumber(row.bottle_closing) + bottleIn,
          blister_opening: normalizeWholeNumber(row.blister_opening) + blisterIn,
          blister_closing: normalizeWholeNumber(row.blister_closing) + blisterIn,
        })
        .eq("movement_date", rowDate);

      if (updateLaterError) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to cascade stock-in to later inventory movement rows.",
            error: {
              code: updateLaterError.code,
              details: updateLaterError.details,
              message: updateLaterError.message,
            },
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      row: {
        id: movementDate,
        movement_date: movementDate,
        bottle_in: nextBottleIn,
        blister_in: nextBlisterIn,
        note,
        created_at: "",
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
