import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 200;
  }

  return Math.min(Math.floor(parsed), 1000);
}

function sanitizeOrLike(value: string) {
  return value.replaceAll(",", " ").trim();
}

export async function GET(request: NextRequest) {
  const qParam = request.nextUrl.searchParams.get("q");
  const limit = toLimit(request.nextUrl.searchParams.get("limit"));

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("user_account")
      .select(
        "user_account_id,user_name,full_name,sponsor,placement,group,account_type,zero_one,code_payment,is_leader,is_new_member,brgy,city,province,region,country,date_created,date_updated",
      )
      .order("date_updated", { ascending: false })
      .limit(limit);

    const q = sanitizeOrLike(qParam ?? "");
    if (q) {
      query = query.or(
        `user_name.ilike.%${q}%,full_name.ilike.%${q}%,zero_one.ilike.%${q}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load user accounts",
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      rows: data ?? [],
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load user accounts",
        error: {
          code: "SERVER_ERROR",
          details: safeMessage,
          message: safeMessage,
        },
      },
      { status: 500 },
    );
  }
}
