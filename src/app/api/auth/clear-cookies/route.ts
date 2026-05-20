import { NextResponse } from "next/server";

const COOKIE_NAMES = [
  "sb-access-token",
  "sb-refresh-token",
  "supabase-auth-token",
  "sb-should-reauth",
];

function expiredCookieVariants(name: string) {
  // Emit multiple variants to improve the chance the browser will accept
  // the cookie deletion regardless of attributes used when the cookie
  // was originally set.
  const base = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
  return [
    // HttpOnly, Lax
    `${base}; HttpOnly; SameSite=Lax`,
    // Non-HttpOnly, Lax
    `${base}; SameSite=Lax`,
    // HttpOnly, None, Secure
    `${base}; HttpOnly; SameSite=None; Secure`,
    // Non-HttpOnly, None, Secure
    `${base}; SameSite=None; Secure`,
  ];
}

export async function GET() {
  const res = NextResponse.json({ ok: true, cleared: COOKIE_NAMES });
  for (const name of COOKIE_NAMES) {
    for (const c of expiredCookieVariants(name)) {
      res.headers.append("Set-Cookie", c);
    }
  }
  return res;
}

export async function POST() {
  return GET();
}
