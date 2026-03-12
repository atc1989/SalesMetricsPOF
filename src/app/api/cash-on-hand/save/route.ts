import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type CashOnHandPayload = {
  trans_date: string;
  pcs_one_thousand: number;
  pcs_five_hundred: number;
  pcs_two_hundred: number;
  pcs_one_hundred: number;
  pcs_fifty: number;
  pcs_twenty: number;
  pcs_ten: number;
  pcs_five: number;
  pcs_one: number;
  pcs_cents: number;
};

function toNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }

  return 0;
}

function readString(body: JsonObject, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function buildPayload(body: JsonObject): CashOnHandPayload | null {
  const transDate = readString(body, "transDate") || readString(body, "trans_date");
  if (!transDate) {
    return null;
  }

  return {
    trans_date: transDate,
    pcs_one_thousand: toNonNegativeInteger(body.pcs_one_thousand),
    pcs_five_hundred: toNonNegativeInteger(body.pcs_five_hundred),
    pcs_two_hundred: toNonNegativeInteger(body.pcs_two_hundred),
    pcs_one_hundred: toNonNegativeInteger(body.pcs_one_hundred),
    pcs_fifty: toNonNegativeInteger(body.pcs_fifty),
    pcs_twenty: toNonNegativeInteger(body.pcs_twenty),
    pcs_ten: toNonNegativeInteger(body.pcs_ten),
    pcs_five: toNonNegativeInteger(body.pcs_five),
    pcs_one: toNonNegativeInteger(body.pcs_one),
    pcs_cents: toNonNegativeInteger(body.pcs_cents),
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonObject | null;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const payload = buildPayload(body);

  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Missing transDate/trans_date." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("cash_on_hand")
      .select("trans_date")
      .eq("trans_date", payload.trans_date)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to check existing cash on hand record",
          error: {
            code: existingError.code,
            details: existingError.details,
            message: existingError.message,
          },
        },
        { status: 500 },
      );
    }

    if (existing) {
      const { error } = await supabase
        .from("cash_on_hand")
        .update(payload)
        .eq("trans_date", payload.trans_date);

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to update cash on hand",
            error: {
              code: error.code,
              details: error.details,
              message: error.message,
            },
          },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase
        .from("cash_on_hand")
        .insert(payload);

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to insert cash on hand",
            error: {
              code: error.code,
              details: error.details,
              message: error.message,
            },
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, row: payload });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save cash on hand",
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
