import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { rebuildInventoryMovementDaily } from "@/lib/rebuildInventoryMovementDaily";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";
const RETRYABLE_RPC_CODES = new Set(["PGRST202", "42883"]);

function readPofNumber(body: JsonObject) {
  const value = body.pofNumber ?? body.pof_number;
  return typeof value === "string" ? value.trim() : "";
}

function readUsername(body: JsonObject) {
  const value = body.username ?? body.ggTransNo ?? body.gg_trans_no;
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

  const pofNumber = readPofNumber(body);
  const username = readUsername(body);

  if (!pofNumber) {
    return NextResponse.json(
      { success: false, message: "Missing pofNumber/pof_number." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (username) {
    const { data, error } = await supabase
      .from("daily_sales")
      .delete()
      .eq("pof_number", pofNumber)
      .eq("username", username)
      .select("daily_sales_id");

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to remove POF",
          error: {
            code: error.code,
            details: error.message,
          },
        },
        { status: 500 },
      );
    }

    const inventoryMovementRebuildWarning =
      await rebuildInventoryMovementDaily(supabase);

    return NextResponse.json({
      success: true,
      data,
      inventoryMovementRebuildWarning,
    });
  }

  // If this fails with signature mismatch, confirm argument names in Supabase:
  // select specific_name, parameter_name
  // from information_schema.parameters
  // where specific_schema = 'public' and specific_name like 'rpc_remove_pof%';
  const paramAttempts: JsonObject[] = [
    { pof_number: pofNumber },
    { p_pof_number: pofNumber },
    { i_pof_number: pofNumber },
  ];

  let data: unknown = null;
  let rpcError: { code?: string; message: string; details?: string | null } | null = null;

  for (const params of paramAttempts) {
    const { data: attemptData, error } = await supabase.rpc("rpc_remove_pof", params as never);

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
        message: "Failed to remove POF",
        error: {
          code: rpcError.code ?? "SUPABASE_RPC_ERROR",
          details: rpcError.message,
        },
      },
      { status: 500 },
    );
  }

  const inventoryMovementRebuildWarning =
    await rebuildInventoryMovementDaily(supabase);

  return NextResponse.json({
    success: true,
    data,
    inventoryMovementRebuildWarning,
  });
}
