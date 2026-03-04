import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ModifyBody = {
  userName?: string;
  user_name?: string;
  zeroOne?: string | null;
  codePayment?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isObject(payload)) {
    return NextResponse.json(
      { success: false, message: "Invalid payload" },
      { status: 400 },
    );
  }

  const body = payload as ModifyBody;
  const userName = (body.userName ?? body.user_name ?? "").trim();

  if (!userName) {
    return NextResponse.json(
      { success: false, message: "Missing userName" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("user_account")
      .update({
        zero_one: body.zeroOne ?? null,
        code_payment: body.codePayment ?? null,
        date_updated: new Date().toISOString(),
      })
      .eq("user_name", userName)
      .select("user_name,zero_one,code_payment,date_updated")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to modify user account",
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
      row: data,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to modify user account",
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
