import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isObject(payload)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("rpc_add_daily_sales", { p: payload });

  if (error) {
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
