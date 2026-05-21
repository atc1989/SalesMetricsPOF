import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import {
  getDefaultPathForRole,
  isPathAllowedForRole,
  normalizeAppRole,
} from "@/lib/auth/roles";

const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Env not configured yet — let the request through so the app can render its own error.
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);
  // If there's a logged-in user, load their profile so we can check activity/role.
  let profile: { role?: string | null; is_active?: boolean | null } | null = null;
  let profileLoadFailed = false;
  if (user && !devBypass) {
    const { data, error } = await supabase
      .from("app_user_profiles")
      .select("role,is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    profileLoadFailed = Boolean(error);
    profile = data ?? null;

    if ((error || !data) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { data: adminProfile, error: adminError } = await admin
        .from("app_user_profiles")
        .select("role,is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      profileLoadFailed = Boolean(adminError);
      profile = adminProfile ?? null;
    }
  }

  if (!user && !publicPath && !devBypass) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  if (user && !publicPath && !devBypass) {
    if (!profile || profileLoadFailed) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { success: false, message: "No active app profile was found for this account." },
          { status: 403 },
        );
      }

      return new NextResponse("No active app profile was found for this account.", {
        status: 403,
      });
    }

    const role = normalizeAppRole(profile?.role);
    const isActive = profile.is_active === true;

    if (!isActive) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { success: false, message: "Account is inactive." },
          { status: 403 },
        );
      }

      return new NextResponse("Account is inactive.", { status: 403 });
    }

    if (!isPathAllowedForRole(role, pathname)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { success: false, message: "You do not have access to this resource." },
          { status: 403 },
        );
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getDefaultPathForRole(role);
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Only redirect authenticated users away from the login page if their app profile is known and active.
  if (user && pathname === "/login" && profile?.is_active === true) {
    const role = normalizeAppRole(profile.role);
    const home = request.nextUrl.clone();
    home.pathname = getDefaultPathForRole(role);
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
