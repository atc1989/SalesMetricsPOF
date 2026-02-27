import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";
const RETRYABLE_RPC_CODES = new Set(["PGRST202", "42883"]);

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;

  if (!isObject(body)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Expected a JSON object." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // If this fails with signature mismatch, confirm argument names in Supabase:
  // select specific_name, parameter_name
  // from information_schema.parameters
  // where specific_schema = 'public' and specific_name like 'rpc_modify_daily_sales%';
  const paramAttempts: JsonObject[] = [
    { payload: body },
    { p_payload: body },
    { i_payload: body },
  ];

  let data: unknown = null;
  let rpcError: { code?: string; message: string; details?: string | null } | null = null;

  for (const params of paramAttempts) {
    const { data: attemptData, error } = await supabase.rpc("rpc_modify_daily_sales", params as never);

    if (!error) {
      data = attemptData;
      rpcError = null;
      break;
    }

    rpcError = error;

    if (!RETRYABLE_RPC_CODES.has(error.code ?? "")) {
      break;
    }
  }

  if (rpcError) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to modify daily sales entry",
        error: {
          code: rpcError.code ?? "SUPABASE_RPC_ERROR",
          details: rpcError.message,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}
