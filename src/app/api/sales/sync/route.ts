import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type GgSalesPayload = {
  data?: unknown;
  [key: string]: unknown;
};

const MANILA_TZ = "Asia/Manila";

function getManilaDateParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

function getDefaultDateRange(now = new Date()) {
  const { year, month, day } = getManilaDateParts(now);
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${day}`,
  };
}

function toGgDate(value: string) {
  return value.replaceAll("-", "");
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildApiKey(now = new Date()) {
  const { year, month, day, hour } = getManilaDateParts(now);
  return `${hour}${year}${month}${day}`;
}

export async function POST(request: NextRequest) {
  const baseUrl = process.env.GG_SALES_BASE_URL;
  const ggUser = process.env.GG_SALES_USER;

  if (!baseUrl || !ggUser) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing GG_SALES_BASE_URL or GG_SALES_USER environment variable.",
      },
      { status: 500 },
    );
  }

  const defaults = getDefaultDateRange();
  let dateFrom = defaults.dateFrom;
  let dateTo = defaults.dateTo;

  try {
    const body = (await request.json().catch(() => ({}))) as { dateFrom?: string; dateTo?: string };

    if (body.dateFrom) {
      if (!isValidIsoDate(body.dateFrom)) {
        return NextResponse.json(
          { success: false, message: "Invalid dateFrom format. Expected YYYY-MM-DD." },
          { status: 400 },
        );
      }
      dateFrom = body.dateFrom;
    }

    if (body.dateTo) {
      if (!isValidIsoDate(body.dateTo)) {
        return NextResponse.json(
          { success: false, message: "Invalid dateTo format. Expected YYYY-MM-DD." },
          { status: 400 },
        );
      }
      dateTo = body.dateTo;
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { success: false, message: "dateFrom cannot be after dateTo." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    user: ggUser,
    apikey: buildApiKey(),
    df: toGgDate(dateFrom),
    dt: toGgDate(dateTo),
  });
  const ggUrl = `${baseUrl}?${params.toString()}`;

  let payload: GgSalesPayload;

  try {
    const ggResponse = await fetch(ggUrl, { method: "GET", cache: "no-store" });

    if (!ggResponse.ok) {
      const bodySnippet = (await ggResponse.text()).slice(0, 500);
      return NextResponse.json(
        {
          success: false,
          message: "GG sales endpoint returned a non-OK response.",
          status: ggResponse.status,
          bodySnippet,
        },
        { status: 502 },
      );
    }

    payload = (await ggResponse.json()) as GgSalesPayload;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch or parse GG sales response.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }

  const topLevelKeys = payload && typeof payload === "object" ? Object.keys(payload) : [];
  const rows = payload?.data;

  if (!Array.isArray(rows)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected GG response shape",
        topLevelKeys,
        sample: payload,
      },
      { status: 502 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error: upsertError } = await supabase.rpc("rpc_upsert_sales_api_list", {
    p_list: rows,
  });

  if (upsertError) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upsert GG sales into Supabase.",
        error: {
          code: upsertError.code ?? "SUPABASE_RPC_ERROR",
          message: upsertError.message,
          details: upsertError.details ?? null,
        },
      },
      { status: 500 },
    );
  }

  const { count, error: countError } = await supabase
    .from("sales_api")
    .select("id", { count: "exact", head: true })
    .gte("transdate", `${dateFrom} 00:00:00`)
    .lte("transdate", `${dateTo} 23:59:59`);

  return NextResponse.json({
    success: true,
    message: "Sync complete",
    ggFetched: rows.length,
    dateFrom,
    dateTo,
    upsertRangeCount: countError ? null : count ?? null,
  });
}
