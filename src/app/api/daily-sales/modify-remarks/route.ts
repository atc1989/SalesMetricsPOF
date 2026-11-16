import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_REMARKS_LENGTH = 1000;

// Updates only the remarks of one daily_sales row (one POF line), so a remark can be fixed
// without re-encoding the POF. Allowed for sales + super_admin via the /api/daily-sales prefix.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const dailySalesId = Number(body?.dailySalesId);
  const remarks = typeof body?.remarks === "string" ? body.remarks.trim() : null;

  if (!Number.isInteger(dailySalesId) || dailySalesId <= 0) {
    return NextResponse.json({ success: false, message: "Missing dailySalesId." }, { status: 400 });
  }

  if (remarks === null) {
    return NextResponse.json({ success: false, message: "Missing remarks." }, { status: 400 });
  }

  if (remarks.length > MAX_REMARKS_LENGTH) {
    return NextResponse.json(
      { success: false, message: `Remarks must be ${MAX_REMARKS_LENGTH} characters or less.` },
      { status: 400 },
    );
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("daily_sales")
    .update({ remarks: remarks || null })
    .eq("daily_sales_id", dailySalesId)
    .select("daily_sales_id,remarks")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update remarks",
        error: { code: error.code, details: error.details, message: error.message },
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ success: false, message: "Sale not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, row: data });
}
