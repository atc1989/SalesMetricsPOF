import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type UserAccountCodeRow = {
  user_name: string | null;
  zero_one: string | null;
  code_payment: string | null;
};

type UsersRow = {
  username: string | null;
};

function normalizeText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function toChunks<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function hasSyncableUsername(
  row: { username: string | null; zero_one: string | null; code_payment: string | null },
  existingUsernames: Set<string>,
): row is { username: string; zero_one: string | null; code_payment: string | null } {
  return typeof row.username === "string" && existingUsernames.has(row.username.toLowerCase());
}

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();

    const [{ data: userAccounts, error: userAccountError }, { data: users, error: usersError }] =
      await Promise.all([
        supabase.from("user_account").select("user_name,zero_one,code_payment"),
        supabase.from("users").select("username"),
      ]);

    if (userAccountError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load user_account rows for code sync.",
          error: {
            code: userAccountError.code,
            details: userAccountError.details,
            message: userAccountError.message,
          },
        },
        { status: 500 },
      );
    }

    if (usersError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to load users rows for code sync.",
          error: {
            code: usersError.code,
            details: usersError.details,
            message: usersError.message,
          },
        },
        { status: 500 },
      );
    }

    const existingUsernames = new Set(
      ((users ?? []) as UsersRow[])
        .map((row) => normalizeText(row.username)?.toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );

    const rowsToSync = ((userAccounts ?? []) as UserAccountCodeRow[])
      .map((row) => ({
        username: normalizeText(row.user_name),
        zero_one: normalizeText(row.zero_one),
        code_payment: normalizeText(row.code_payment),
      }))
      .filter((row) => hasSyncableUsername(row, existingUsernames));

    let syncedRows = 0;

    for (const chunk of toChunks(rowsToSync, 500)) {
      const { error } = await supabase.from("users").upsert(chunk, {
        onConflict: "username",
      });

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to sync codes into users.",
            error: {
              code: error.code,
              details: error.details,
              message: error.message,
            },
          },
          { status: 500 },
        );
      }

      syncedRows += chunk.length;
    }

    return NextResponse.json({
      success: true,
      message: "Sync codes complete.",
      syncedRows,
      skippedRows: ((userAccounts ?? []) as UserAccountCodeRow[]).length - rowsToSync.length,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync codes.",
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
