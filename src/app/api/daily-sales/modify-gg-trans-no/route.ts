import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readDailySalesId(body: JsonObject) {
  const value = body.dailySalesId ?? body.daily_sales_id;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
}

function readUsername(body: JsonObject) {
  const value = body.username ?? body.ggTransNo ?? body.gg_trans_no;
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;

  if (!isObject(body)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const dailySalesId = readDailySalesId(body);
  const username = readUsername(body);

  if (!Number.isFinite(dailySalesId)) {
    return NextResponse.json(
      { success: false, message: "Missing dailySalesId/daily_sales_id." },
      { status: 400 },
    );
  }

  if (!username) {
    return NextResponse.json(
      { success: false, message: "Missing username/ggTransNo/gg_trans_no." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("rpc_modify_daily_sales_gg_trans_no", {
    p_daily_sales_id: dailySalesId,
    p_username: username,
  });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to modify GG transaction number",
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
