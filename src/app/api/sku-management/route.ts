import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { dailySalesPackageCatalog, isValidSkuId, skuDiscountColumns } from "@/lib/dailySalesPackages";

export const dynamic = "force-dynamic";

type SkuUpsert = Record<string, string | number | boolean>;

const failure = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const isNonNegativeInteger = (value: number) => Number.isInteger(value) && value >= 0;

// Validates one SKU row from the SKU Management page; returns an error message or the DB row.
function toUpsert(raw: unknown, updatedAt: string): string | SkuUpsert {
  const row = (raw ?? {}) as Record<string, unknown>;
  const packageType = String(row.package_type ?? "").trim();
  if (!isValidSkuId(packageType)) {
    return `SKU ID "${packageType || "(blank)"}" must use only A-Z, 0-9 and _`;
  }

  const label = String(row.label ?? "").trim();
  if (!label) return `${packageType}: name is required`;

  const price = Number(row.original_price);
  if (!Number.isFinite(price) || price < 0) return `${packageType}: price must be 0 or more`;

  const bottleCount = Number(row.bottle_count ?? 0);
  const blisterCount = Number(row.bundled_blister_count ?? 0);
  if (!isNonNegativeInteger(bottleCount) || !isNonNegativeInteger(blisterCount)) {
    return `${packageType}: bottles and blisters must be whole numbers, 0 or more`;
  }

  const sortOrder = Number(row.sort_order ?? 0);
  const upsert: SkuUpsert = {
    package_type: packageType,
    label,
    category: String(row.category ?? "package").trim() || "package",
    original_price: price,
    bottle_count: bottleCount,
    bundled_blister_count: blisterCount,
    // Blister-only SKUs default the encoder's "To blister" flag on, as the built-ins do.
    default_is_to_blister:
      typeof row.default_is_to_blister === "boolean" ? row.default_is_to_blister : bottleCount === 0 && blisterCount > 0,
    sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    is_active: row.is_active !== false,
    is_builtin: Object.hasOwn(dailySalesPackageCatalog, packageType),
    updated_at: updatedAt,
  };

  for (const column of Object.values(skuDiscountColumns)) {
    const discount = Number(row[column] ?? 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > price) {
      return `${packageType}: ${column} must be between 0 and the price`;
    }
    upsert[column] = discount;
  }

  return upsert;
}

const dbError = (message: string, error: { code: string; details: string; message: string }) =>
  NextResponse.json(
    { success: false, message, error: { code: error.code, details: error.details, message: error.message } },
    { status: 500 },
  );

// super_admin only: /api/sku-management is not in any other role's API prefixes (src/lib/auth/roles.ts).
// Saves edits to existing SKUs, including archive/restore (is_active).
export async function PUT(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { rows?: unknown } | null;
  const rows = payload?.rows;

  if (!Array.isArray(rows) || rows.length === 0) return failure("Missing rows");

  const updatedAt = new Date().toISOString();
  const upserts: SkuUpsert[] = [];
  for (const raw of rows) {
    const result = toUpsert(raw, updatedAt);
    if (typeof result === "string") return failure(result);
    upserts.push(result);
  }

  const { error } = await getSupabaseAdminClient()
    .from("sku_prices")
    .upsert(upserts, { onConflict: "package_type" });

  if (error) return dbError("Failed to save SKUs", error);

  return NextResponse.json({ success: true, count: upserts.length });
}

// Adds a new product; the SKU ID cannot already exist (archived ones included).
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { row?: unknown } | null;
  const result = toUpsert(payload?.row, new Date().toISOString());
  if (typeof result === "string") return failure(result);

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("sku_prices")
    .select("package_type")
    .eq("package_type", result.package_type)
    .maybeSingle();

  if (lookupError) return dbError("Failed to add SKU", lookupError);
  if (existing || Object.hasOwn(dailySalesPackageCatalog, String(result.package_type))) {
    return failure(`SKU ${result.package_type} already exists`, 409);
  }

  const { error } = await supabase.from("sku_prices").insert(result);
  if (error) return dbError("Failed to add SKU", error);

  return NextResponse.json({ success: true });
}
