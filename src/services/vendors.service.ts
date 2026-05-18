import { supabase } from "@/lib/supabase/client";
import type { Vendor } from "../types/billing";
import type { PostgrestError } from "@supabase/supabase-js";

function mapVendorError(error: PostgrestError | null | undefined, fallback: string) {
  if (!error) return fallback;
  if (error.code === "42501") {
    return "You do not have permission to manage vendors.";
  }
  return error.message || fallback;
}

export async function listVendors(query?: string) {
  let request = supabase.from("vendors").select("id,name,address").order("name");

  if (query && query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await request.limit(50);

  if (error) {
    return { data: [] as Vendor[], error: mapVendorError(error, "Failed to load vendors.") };
  }

  return { data: (data ?? []) as Vendor[], error: null as string | null };
}

export async function createVendor(name: string, address?: string | null) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { data: null as Vendor | null, error: "Vendor name is required." };
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({ name: trimmedName, address: address ?? null })
    .select("id,name,address")
    .single();

  if (error) {
    return { data: null as Vendor | null, error: mapVendorError(error, "Failed to create vendor.") };
  }

  return { data: data as Vendor, error: null as string | null };
}
