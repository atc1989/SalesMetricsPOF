import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DailySalesPofRow = {
  pof_number: string | null;
};

function formatPofBaseFromDate(date: string): string {
  const parsed = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  if (!parsed) {
    return "";
  }

  const [, month, day] = parsed;
  const year = date.slice(2, 4);
  return `${month}${day}${year} - `;
}

function buildNextPofNumber(base: string, rows: DailySalesPofRow[]) {
  let maxSuffix = 0;

  for (const row of rows) {
    const value = row.pof_number?.trim() ?? "";
    if (!value.startsWith(base)) {
      continue;
    }

    const suffix = Number(value.slice(base.length).trim());
    if (Number.isInteger(suffix) && suffix > maxSuffix) {
      maxSuffix = suffix;
    }
  }

  return `${base}${maxSuffix + 1}`;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const base = formatPofBaseFromDate(date);

  if (!base) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing date." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_sales")
    .select("pof_number")
    .eq("trans_date", date)
    .ilike("pof_number", `${base}%`);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate next POF number",
        error: {
          code: error.code,
          details: error.details,
          message: error.message,
        },
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as DailySalesPofRow[];
  const pofNumber = buildNextPofNumber(base, rows);

  return NextResponse.json({
    success: true,
    data: {
      pofNumber,
    },
  });
}
