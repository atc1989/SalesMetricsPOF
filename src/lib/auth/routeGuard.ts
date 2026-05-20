import { NextResponse, type NextRequest } from "next/server";

import {
  isPathAllowedForRole,
  normalizeAppRole,
  type AppRole,
} from "@/lib/auth/roles";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

export type RouteAuthContext = {
  userId: string;
  email: string;
  role: AppRole;
};

export async function requireRouteAccess(request: NextRequest) {
  const serverClient = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      ),
      auth: null,
    };
  }

  const adminClient = getSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("app_user_profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = normalizeAppRole(profile?.role);
  const isActive = profile?.is_active ?? false;

  if (!isActive) {
    return {
      response: NextResponse.json(
        { success: false, message: "Account is inactive." },
        { status: 403 },
      ),
      auth: null,
    };
  }

  if (!isPathAllowedForRole(role, request.nextUrl.pathname)) {
    return {
      response: NextResponse.json(
        { success: false, message: "You do not have access to this resource." },
        { status: 403 },
      ),
      auth: null,
    };
  }

  return {
    response: null,
    auth: {
      userId: user.id,
      email: user.email ?? "",
      role,
    },
  };
}
