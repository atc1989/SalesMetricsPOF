import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Read-only SKU prices for the encoder/reports (sales role allowed via /api/daily-sales).
export async function GET() {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("sku_prices")
      .select(
        "package_type,original_price,distributor_discount,stockist_discount,city_stockist_discount,center_discount,updated_at",
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load SKU prices",
          error: { code: error.code, details: error.details, message: error.message },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, rows: data ?? [] });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load SKU prices",
        error: { code: "SERVER_ERROR", details: safeMessage, message: safeMessage },
      },
      { status: 500 },
    );
  }
}
