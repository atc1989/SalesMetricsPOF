import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type UserRow = {
  username: string | null;
  name: string | null;
};

function toLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }

  return Math.min(Math.floor(parsed), 25);
}

function sanitizeOrLike(value: string): string {
  return value.replaceAll(',', ' ').trim();
}

export async function GET(request: NextRequest) {
  const q = sanitizeOrLike(request.nextUrl.searchParams.get('q') ?? '');
  const limit = toLimit(request.nextUrl.searchParams.get('limit'));

  if (!q) {
    return NextResponse.json({ success: true, rows: [] });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('username,name')
      .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
      .order('username', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to search users',
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    const rows = ((data ?? []) as UserRow[])
      .filter((entry) => Boolean(entry.username))
      .map((entry) => ({
        username: entry.username ?? '',
        memberName: entry.name ?? '',
      }));

    return NextResponse.json({ success: true, rows });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to search users',
        error: {
          code: 'SERVER_ERROR',
          details: safeMessage,
          message: safeMessage,
        },
      },
      { status: 500 }
    );
  }
}
