import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}


function normalizeDailySalesPayload(payload: JsonObject): JsonObject {
  const normalized = { ...payload };

  if (normalized.member_type === "CITY STOCKIST") {
    normalized.member_type = "STOCKIST";
  }

  return normalized;
}

function canFallbackToDirectInsert(error: { code?: string | null; message?: string; details?: string | null }) {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.code === "23505" || (message.includes("duplicate") && message.includes("pof"));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isObject(payload)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const normalizedPayload = normalizeDailySalesPayload(payload);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("rpc_add_daily_sales", { p: normalizedPayload });

  if (error) {
    if (canFallbackToDirectInsert(error)) {
      const { data: insertedRow, error: insertError } = await supabase
        .from("daily_sales")
        .insert(normalizedPayload)
        .select("daily_sales_id")
        .single();

      if (!insertError) {
        return NextResponse.json({ success: true, data: insertedRow, fallback: "direct-insert" });
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to add daily sales entry",
          error: {
            code: insertError.code,
            details: insertError.details,
            message: insertError.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add daily sales entry",
        error: {
          code: error.code,
          details: error.details,
          message: error.message,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}
