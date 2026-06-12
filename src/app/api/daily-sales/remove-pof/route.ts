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

function readDailySalesIds(body: JsonObject) {
  const value = body.dailySalesIds ?? body.daily_sales_ids ?? body.dailySalesId ?? body.daily_sales_id;
  const values = Array.isArray(value) ? value : [value];

  return values
    .map((entry) => {
      if (typeof entry === "number" && Number.isInteger(entry)) {
        return entry;
      }

      if (typeof entry === "string" && entry.trim()) {
        const parsed = Number(entry);
        return Number.isInteger(parsed) ? parsed : null;
      }

      return null;
    })
    .filter((entry): entry is number => entry !== null && entry > 0);
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
  const dailySalesIds = readDailySalesIds(body);

  const supabase = getSupabaseAdminClient();

  if (dailySalesIds.length > 0) {
    const { data, error } = await supabase
      .from("daily_sales")
      .delete()
      .in("daily_sales_id", dailySalesIds)
      .select("daily_sales_id");

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to remove daily sales row",
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
      deletedCount: data?.length ?? 0,
      inventoryMovementRebuildWarning,
    });
  }

  if (!pofNumber) {
    return NextResponse.json(
      { success: false, message: "Missing pofNumber/pof_number." },
      { status: 400 },
    );
  }

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
