import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_APP_ROLE,
  normalizeAppRole,
  type AppUserProfile,
} from "@/lib/auth/roles";

type AppUserProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
};

export function profileFromAuthUser(input: {
  id: string;
  email?: string | null;
}): AppUserProfile {
  return {
    userId: input.id,
    email: input.email ?? "",
    fullName: null,
    role: DEFAULT_APP_ROLE,
    isActive: true,
  };
}

export function mapAppUserProfileRow(row: AppUserProfileRow): AppUserProfile {
  return {
    userId: row.user_id,
    email: row.email ?? "",
    fullName: row.full_name,
    role: normalizeAppRole(row.role),
    isActive: row.is_active ?? false,
  };
}

export async function getAppUserProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("app_user_profiles")
    .select("user_id,email,full_name,role,is_active")
    .eq("user_id", userId)
    .maybeSingle<AppUserProfileRow>();

  if (error) {
    return { profile: null, error };
  }

  return {
    profile: data ? mapAppUserProfileRow(data) : null,
    error: null,
  };
}
