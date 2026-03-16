import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;
type DailySalesInsertRow = {
  event_name?: string;
  trans_date?: string;
  pof_number?: string;
  member_name?: string;
  username?: string;
  is_new_member?: boolean;
  member_type?: string;
  package_type?: string;
  original_price?: number;
  quantity?: number;
  is_to_blister?: boolean;
  blister_count?: number;
  discount?: number;
  price_after_discount?: number;
  one_time_discount?: number;
  bottle_count?: number;
  released_count?: number;
  released_blpk_count?: number;
  to_follow_count?: number;
  to_follow_blpk_count?: number;
  sales?: number;
  mode_of_payment?: string | null;
  payment_type?: string | null;
  reference_number?: string | null;
  sales_two?: number;
  mode_of_payment_two?: string | null;
  payment_type_two?: string | null;
  reference_number_two?: string | null;
  remarks?: string;
  received_by?: string;
  collected_by?: string;
  fullfilment_date?: string;
};

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

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown) {
  if (value == null) {
    return null;
  }

  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function buildDirectInsertPayload(payload: JsonObject): DailySalesInsertRow {
  return {
    event_name: readString(payload.event_name),
    trans_date: readString(payload.trans_date),
    pof_number: readString(payload.pof_number),
    member_name: readString(payload.member_name),
    username: readString(payload.username),
    is_new_member: readBoolean(payload.is_new_member),
    member_type: readString(payload.member_type),
    package_type: readString(payload.package_type),
    original_price: readNumber(payload.original_price),
    quantity: readNumber(payload.quantity),
    is_to_blister: readBoolean(payload.is_to_blister),
    blister_count: readNumber(payload.blister_count),
    discount: readNumber(payload.discount),
    price_after_discount: readNumber(payload.price_after_discount),
    one_time_discount: readNumber(payload.one_time_discount),
    bottle_count: readNumber(payload.bottle_count),
    released_count: readNumber(payload.released_count),
    released_blpk_count: readNumber(payload.released_blpk_count),
    to_follow_count: readNumber(payload.to_follow_count),
    to_follow_blpk_count: readNumber(payload.to_follow_blpk_count),
    sales: readNumber(payload.sales),
    mode_of_payment: readNullableString(payload.mode_of_payment),
    payment_type: readNullableString(payload.payment_type),
    reference_number: readNullableString(payload.reference_number),
    sales_two: readNumber(payload.sales_two),
    mode_of_payment_two: readNullableString(payload.mode_of_payment_two),
    payment_type_two: readNullableString(payload.payment_type_two),
    reference_number_two: readNullableString(payload.reference_number_two),
    remarks: readString(payload.remarks),
    received_by: readString(payload.received_by),
    collected_by: readString(payload.collected_by),
    fullfilment_date: readString(payload.fullfilment_date),
  };
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
      const insertPayload = buildDirectInsertPayload(normalizedPayload);
      const { data: insertedRow, error: insertError } = await supabase
        .from("daily_sales")
        .insert(insertPayload)
        .select("daily_sales_id")
        .single();

      if (!insertError) {
        return NextResponse.json({ success: true, data: insertedRow, fallback: "direct-insert" });
      }

      return NextResponse.json(
        {
          success: false,
          message: insertError.message || "Failed to add daily sales entry",
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
